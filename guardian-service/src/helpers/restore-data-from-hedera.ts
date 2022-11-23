import { DataBaseHelper, Singleton } from '@guardian/common';
import { Workers } from '@helpers/workers';
import {
    DidDocumentStatus,
    ISchema, PolicyType,
    SchemaCategory,
    SchemaStatus,
    UserRole,
    WorkerTaskType
} from '@guardian/interfaces';
import {
    DIDDocument,
    DIDMessage,
    MessageServer,
    MessageType,
    TopicMessage,
    VcDocument,
    VCMessage, VpDocument, VPMessage
} from '@hedera-modules';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { Schema as SchemaCollection } from '@entity/schema';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { VpDocument as VpDocumentCollection } from '@entity/vp-document';
import { PolicyImportExportHelper } from '@policy-engine/helpers/policy-import-export-helper';
import { Policy as PolicyCollection } from '@entity/policy';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';

/**
 * Restore data from hedera class
 */
@Singleton
export class RestoreDataFromHedera {

    /**
     * Workers
     * @private
     */
    private readonly workers: Workers;

    /**
     * Hello world topic id
     * @private
     */
    private readonly MAIN_TOPIC_ID = process.env.INITIALIZATION_TOPIC_ID;
    /**
     * Users service
     * @private
     */
    private readonly users: Users;
    /**
     * Wallet service
     * @private
     */
    private readonly wallet: Wallet;

    constructor() {
        this.workers = new Workers();
        this.users = new Users();
        this.wallet = new Wallet();
    }

    /**
     * Read topic
     * @param topicId
     * @private
     */
    private async readTopicMessages(topicId: string): Promise<any[]> {
        if (typeof topicId !== 'string') {
            throw new Error('Bad topicId');
        }

        const messages = await this.workers.addRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGES,
            data: {
                operatorId: null,
                operatorKey: null,
                dryRun: false,
                topic: topicId
            }
        }, 1);
        const result = [];
        let errors = 0;
        for (const m of messages) {
            try {
                const r = MessageServer.fromMessage<any>(m.message);
                r.setTopicId(topicId);
                r.setId(m.id);
                await MessageServer.loadIPFS(r);
                result.push(r);
            } catch (e) {
                ++errors;
            }
        }
        console.error('errors', errors, result.length);
        return result;
    }

    /**
     * Restore schema
     * @param s
     * @private
     */
    private async restoreSchema(s: any): Promise<void> {
        const [schema, context] = s.documents
        const schemaObj: Partial<ISchema> = {
            uuid: s.uuid,
            name: s.name,
            description: s.description,
            entity: s.entity,
            status: SchemaStatus.PUBLISHED,
            readonly: false,
            document: schema,
            context,
            version: s.version,
            creator: s.owner,
            owner: s.owner,
            topicId: s.topicId,
            messageId: s.id,
            documentURL: s.getUrls()[0],
            contextURL: s.getUrls()[1],
            iri: `#${s.uuid}&${s.version}`, // restore iri
            isOwner: true,
            isCreator: true,
            system: false,
            active: true,
            category: SchemaCategory.USER
        };
        const result = await new DataBaseHelper(SchemaCollection).create(schemaObj);
        await new DataBaseHelper(SchemaCollection).save(result);
    }

    /**
     * Restore policy documents
     * @param topicMessages
     * @param owner
     * @param policyId
     * @private
     */
    private async restorePolicyDocuments(topicMessages: any, owner: string, policyId: string): Promise<void> {
        for (const message of topicMessages) {
            switch (message.constructor) {
                case DIDMessage: {
                    await new DataBaseHelper(DidDocumentCollection).save({
                        did: message.document.id,
                        document: message.document,
                        status: DidDocumentStatus.CREATE,
                        messageId: message.id,
                        topicId: message.topicId
                    });
                    break;
                }

                case VCMessage: {
                    const vcDoc = VcDocument.fromJsonTree(message.document);
                    await new DataBaseHelper(VcDocumentCollection).save({
                        hash: vcDoc.toCredentialHash(),
                        owner,
                        messageId: message.id,
                        policyId,
                        topicId: message.topicId,
                        document: vcDoc.toJsonTree(),
                        type: undefined
                    });
                    break;
                }

                case VPMessage: {
                    const vpDoc = VpDocument.fromJsonTree(message.document)
                    await new DataBaseHelper(VpDocumentCollection).save({
                        hash: vpDoc.toCredentialHash(),
                        policyId,
                        owner,
                        messageId: message.id,
                        topicId: message.topicId,
                        document: vpDoc.toJsonTree(),
                        type: undefined
                    });
                    break;
                }

                case TopicMessage: {
                    if (message.messageType === 'DYNAMIC_TOPIC' && message.childId) {
                        const messages = await this.readTopicMessages(message.childId);
                        await this.restorePolicyDocuments(messages, owner, policyId)
                    }
                    break;
                }

                default:
                    console.error('Unknown message type', message);
            }
        }
    }

    /**
     * Restore policy
     * @param policyTopicId
     * @param owner
     * @private
     */
    private async restorePolicy(policyTopicId: string, owner: string): Promise<void> {
        try {
            const policyMessages = await this.readTopicMessages(policyTopicId);

            const publishedSchemas = policyMessages.filter(m => m._action === 'publish-schema');

            // Restore schemas
            for (const s of publishedSchemas) {
                await this.restoreSchema(s);
            }

            // Restore policy
            const publishedPolicies = policyMessages.filter(m => m._action === 'publish-policy');
            for (const policy of publishedPolicies) {
                const parsedPolicyFile = await PolicyImportExportHelper.parseZipFile(policy.document);
                const policyObject = parsedPolicyFile.policy;

                const policyInstanceTopicMessage = policyMessages.find(m => m.rationale === policy.id);
                policyObject.instanceTopicId = policyInstanceTopicMessage.childId;
                policyObject.status = PolicyType.PUBLISH;
                policyObject.topicId = policyTopicId;

                const policyInstanceMessages = await this.readTopicMessages(policyInstanceTopicMessage.childId);

                const p = new DataBaseHelper(PolicyCollection).create(policyObject);
                const r = await new DataBaseHelper(PolicyCollection).save(p);

                await this.restorePolicyDocuments(policyInstanceMessages, owner, r.id.toString());

                await new BlockTreeGenerator().generate(r.id.toString());

            }
        } catch (e) {
            console.error(e)
        }

    }

    /**
     * Find message by type
     * @param type
     * @param messages
     * @private
     */
    private findMessageByType(type: MessageType, messages: any[]): any {
        return messages.find(m => m.type === type)
    }

    /**
     * Find messages by type
     * @param type
     * @param messages
     * @private
     */
    private findMessagesByType(type: MessageType, messages: any[]): any[] {
        return messages.filter(m => m.type === type)
    }

    /**
     * Restore standard registry
     * @param username
     * @param hederaAccountID
     * @param hederaAccountKey
     */
    async restoreRootAuthority(username: string, hederaAccountID: string, hederaAccountKey): Promise<void> {
        const did = DIDDocument.create(hederaAccountKey, null);
        const didString = did.getDid();

        // didString = 'did:hedera:testnet:zYVrjgg5HmNJVdn9j81P3k8ZeJfmdFv8SzsKAwPk5cB'

        const user = await this.users.getUser(username);

        if (user.role !== UserRole.STANDARD_REGISTRY) {
            throw new Error('User is not a Standard Registry')
        }

        const mainTopicMessages = await this.readTopicMessages(this.MAIN_TOPIC_ID);
        const currentRAMessage = mainTopicMessages.find(m => m.did?.includes(didString));

        const RAMessages = await this.readTopicMessages(currentRAMessage.registrantTopicId);

        // Restore account
        const didDocumentMessage = this.findMessageByType(MessageType.DIDDocument, RAMessages);
        const vcDocumentMessage = this.findMessageByType(MessageType.VCDocument, RAMessages);

        if (!didDocumentMessage) {
            throw new Error('Couldn\'t find DID document')
        }

        await new DataBaseHelper(DidDocumentCollection).save({
            did: didDocumentMessage.document.id,
            document: didDocumentMessage.document,
            status: DidDocumentStatus.CREATE,
            messageId: didDocumentMessage.id,
            topicId: didDocumentMessage.topicId
        });

        if (vcDocumentMessage) {
            const vcDoc = VcDocument.fromJsonTree(vcDocumentMessage.document);
            await new DataBaseHelper(VcDocumentCollection).save({
                hash: vcDoc.toCredentialHash(),
                owner: didDocumentMessage.document.id,
                document: vcDoc.toJsonTree(),
                type: 'STANDARD_REGISTRY'
            });
        }

        await this.users.updateCurrentUser(username, {
            did: didDocumentMessage.document.id,
            parent: undefined,
            hederaAccountId: hederaAccountID
        });
        await this.wallet.setKey(user.walletToken, KeyType.KEY, didDocumentMessage.document.id, hederaAccountKey);

        // Restore policies
        for (const policyMessage of this.findMessagesByType(MessageType.Policy, RAMessages)) {
            await this.restorePolicy(policyMessage.policyTopicId, didDocumentMessage.document.id);
        }
    }
}
