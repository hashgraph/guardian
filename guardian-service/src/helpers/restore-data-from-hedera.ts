import {
    DataBaseHelper,
    Singleton,
    Schema as SchemaCollection,
    DidDocument as DidDocumentCollection,
    VcDocument as VcDocumentCollection,
    VpDocument as VpDocumentCollection,
    Policy as PolicyCollection,
    Topic,
    Token,
    Workers,
    DIDDocument,
    DIDMessage,
    MessageServer,
    MessageType,
    TopicMessage,
    VcDocumentDefinition as VcDocument,
    VCMessage,
    VpDocumentDefinition as VpDocument,
    VPMessage,
    KeyType, Wallet,
    Users
} from '@guardian/common';
import {
    DidDocumentStatus,
    ISchema,
    PolicyType,
    SchemaCategory,
    SchemaStatus,
    TopicType,
    UserRole,
    WorkerTaskType,
} from '@guardian/interfaces';
import { PolicyImportExportHelper } from '@policy-engine/helpers/policy-import-export-helper';
import { PolicyEngine } from '@policy-engine/policy-engine';

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

    /**
     * Main topic update interval
     * @private
     */
    private readonly UPDATE_INTERVAL = 2 * 60 * 1000;

    /**
     * Last update
     * @private
     */
    private mainTopicLastUpdate = 0;

    /**
     * MainTopicMessages
     * @private
     */
    private mainTopicMessages: any[] = [];

    constructor() {
        this.workers = new Workers();
        this.users = new Users();
        this.wallet = new Wallet();
    }

    /**
     * Read topic
     * @param topicId
     * @param loadIPFS
     * @private
     */
    private async readTopicMessages(
        topicId: string,
        loadIPFS = true
    ): Promise<any[]> {
        if (typeof topicId !== 'string') {
            throw new Error('Bad topicId');
        }

        const messages = await this.workers.addRetryableTask(
            {
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    operatorId: null,
                    operatorKey: null,
                    dryRun: false,
                    topic: topicId,
                },
            },
            10
        );
        const result = [];
        let errors = 0;
        for (const m of messages) {
            try {
                const r = MessageServer.fromMessage<any>(m.message);
                r.setTopicId(topicId);
                r.setId(m.id);
                if (loadIPFS) {
                    await MessageServer.loadIPFS(r);
                    console.log('loadIPFS', r);
                }
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
        const [schema, context] = s.documents;
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
            category: SchemaCategory.POLICY,
            codeVersion: s.codeVersion
        };
        const result = new DataBaseHelper(SchemaCollection).create(schemaObj);
        await new DataBaseHelper(SchemaCollection).save(result);
    }

    /**
     * Restore policy documents
     * @param topicMessages
     * @param owner
     * @param policyId
     * @param user
     * @param hederaAccountKey
     * @private
     */
    private async restorePolicyDocuments(
        topicMessages: any,
        owner: string,
        policyId: string,
        uuid: string,
        user: any,
        hederaAccountKey: string
    ): Promise<void> {
        for (const message of topicMessages) {
            switch (message.constructor) {
                case DIDMessage: {
                    await new DataBaseHelper(DidDocumentCollection).save({
                        did: message.document.id,
                        document: message.document,
                        status: DidDocumentStatus.CREATE,
                        messageId: message.id,
                        topicId: message.topicId,
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
                        type: undefined,
                    });
                    break;
                }

                case VPMessage: {
                    const vpDoc = VpDocument.fromJsonTree(message.document);
                    await new DataBaseHelper(VpDocumentCollection).save({
                        hash: vpDoc.toCredentialHash(),
                        policyId,
                        owner,
                        messageId: message.id,
                        topicId: message.topicId,
                        document: vpDoc.toJsonTree(),
                        type: undefined,
                    });
                    break;
                }

                case TopicMessage: {
                    if (
                        message.messageType === 'DYNAMIC_TOPIC' &&
                        message.childId
                    ) {
                        const messages = await this.readTopicMessages(
                            message.childId
                        );

                        await this.restoreTopic(
                            {
                                topicId: message.childId,
                                name: messages[0].name,
                                description: messages[0].description,
                                owner: messages[0].owner,
                                type: TopicType.DynamicTopic,
                                policyId,
                                policyUUID: uuid,
                            },
                            user,
                            null,
                            null
                        );

                        await this.restorePolicyDocuments(
                            messages,
                            owner,
                            policyId,
                            uuid,
                            user,
                            hederaAccountKey
                        );
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
     * @param user
     * @param hederaAccountID
     * @param hederaAccountKey
     * @private
     */
    private async restorePolicy(
        policyTopicId: string,
        owner: string,
        user: any,
        hederaAccountID: string,
        hederaAccountKey: string
    ): Promise<void> {
        try {
            const policyMessages = await this.readTopicMessages(policyTopicId);

            await this.restoreTopic(
                {
                    topicId: policyTopicId,
                    name: policyMessages[0].name,
                    description: policyMessages[0].description,
                    owner,
                    type: TopicType.PolicyTopic,
                    policyId: null,
                    policyUUID: null,
                },
                user,
                hederaAccountKey,
                hederaAccountKey
            );

            // Restore tokens
            for (const {
                tokenId,
                tokenName,
                tokenSymbol,
                tokenType,
                decimals,
            } of this.findMessagesByType(MessageType.Token, policyMessages)) {
                await new DataBaseHelper(Token).save({
                    tokenId,
                    tokenName,
                    tokenSymbol,
                    tokenType,
                    decimals,
                    initialSupply: 0,
                    adminId: hederaAccountID,
                    changeSupply: false,
                    enableAdmin: false,
                    enableKYC: false,
                    enableFreeze: false,
                    enableWipe: false,
                    owner,
                });
            }

            const publishedSchemas = policyMessages.filter(
                (m) => m._action === 'publish-schema'
            );

            // Restore schemas
            for (const s of publishedSchemas) {
                await this.restoreSchema(s);
            }

            // Restore policy
            const publishedPolicies = policyMessages.filter(
                (m) => m._action === 'publish-policy'
            );
            for (const policy of publishedPolicies) {
                const parsedPolicyFile =
                    await PolicyImportExportHelper.parseZipFile(
                        policy.document
                    );
                const policyObject = parsedPolicyFile.policy;

                policyObject.instanceTopicId = policy.instanceTopicId;
                policyObject.synchronizationTopicId =
                    policy.synchronizationTopicId;
                policyObject.status = PolicyType.PUBLISH;
                policyObject.topicId = policyTopicId;
                if (!policyObject.instanceTopicId) {
                    const policyInstanceTopicMessage = policyMessages.find(
                        (m) => m.rationale === policy.id
                    );
                    policyObject.instanceTopicId =
                        policyInstanceTopicMessage.childId;
                }

                const policyInstanceMessages = await this.readTopicMessages(
                    policyObject.instanceTopicId
                );
                const p = new DataBaseHelper(PolicyCollection).create(
                    policyObject
                );
                const r = await new DataBaseHelper(PolicyCollection).save(p);

                await this.restoreTopic(
                    {
                        topicId: policyObject.instanceTopicId,
                        name: policyInstanceMessages[0].name,
                        description: policyInstanceMessages[0].description,
                        owner,
                        type: TopicType.InstancePolicyTopic,
                        policyId: r.id.toString(),
                        policyUUID: r.uuid,
                    },
                    user,
                    hederaAccountKey,
                    hederaAccountKey
                );

                await this.restorePolicyDocuments(
                    policyInstanceMessages,
                    owner,
                    r.id.toString(),
                    r.uuid,
                    user,
                    hederaAccountKey
                );

                await new PolicyEngine().generateModel(r.id.toString());
                // await new BlockTreeGenerator().generate(r.id.toString());
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Find message by type
     * @param type
     * @param messages
     * @private
     */
    private findMessageByType(type: MessageType, messages: any[]): any {
        return messages.find((m) => m.type === type);
    }

    /**
     * Find messages by type
     * @param type
     * @param messages
     * @private
     */
    private findMessagesByType(type: MessageType, messages: any[]): any[] {
        return messages.filter((m) => m.type === type);
    }

    /**
     * Restore topic
     * @param topic
     * @param user
     * @param topicAdminKey
     * @param topicSubmitKey
     * @private
     */
    private async restoreTopic(
        topic: any,
        user: any,
        topicAdminKey: string,
        topicSubmitKey: string
    ): Promise<void> {
        await new DataBaseHelper(Topic).save(topic);
        await Promise.all([
            this.wallet.setKey(
                user.walletToken,
                KeyType.TOPIC_SUBMIT_KEY,
                topic.topicId,
                topicAdminKey
            ),
            this.wallet.setKey(
                user.walletToken,
                KeyType.TOPIC_ADMIN_KEY,
                topic.topicId,
                topicSubmitKey
            ),
        ]);
    }

    /**
     * Get main topic messages
     * @private
     */
    private async getMainTopicMessages(): Promise<any[]> {
        const currentTime = Date.now();
        if (currentTime - this.mainTopicLastUpdate > this.UPDATE_INTERVAL) {
            this.mainTopicMessages = await this.readTopicMessages(
                this.MAIN_TOPIC_ID
            );
            this.mainTopicLastUpdate = currentTime;
        }

        return this.mainTopicMessages;
    }

    /**
     * FindAllUserTopics
     * @param username
     * @param hederaAccountID
     * @param hederaAccountKey
     */
    async findAllUserTopics(
        username: string,
        hederaAccountID: string,
        hederaAccountKey
    ): Promise<any[]> {
        const mainTopicMessages = await this.getMainTopicMessages();

        const did = await DIDDocument.create(hederaAccountKey, null);
        const didString = did.getDid();

        const foundMessages = mainTopicMessages
            .filter((m) => !!m.did)
            .filter((m) => m.did?.includes(didString));

        return foundMessages.map((m) => {
            return {
                topicId: /^.+(\d+\.\d+\.\d+)$/.exec(m.did)[1],
                timestamp: Math.floor(parseFloat(m.id) * 1000),
            };
        });
    }

    /**
     * Restore standard registry
     * @param username
     * @param hederaAccountID
     * @param hederaAccountKey
     * @param userTopic
     */
    async restoreRootAuthority(
        username: string,
        hederaAccountID: string,
        hederaAccountKey,
        userTopic: string
    ): Promise<void> {
        const did = await DIDDocument.create(hederaAccountKey, null);
        const didString = did.getDid();

        // didString = 'did:hedera:testnet:zYVrjgg5HmNJVdn9j81P3k8ZeJfmdFv8SzsKAwPk5cB'

        const user = await this.users.getUser(username);

        if (user.role !== UserRole.STANDARD_REGISTRY) {
            throw new Error('User is not a Standard Registry');
        }

        const mainTopicMessages = await this.getMainTopicMessages();

        const currentRAMessage = mainTopicMessages.find((m) => {
            return m.did?.includes(didString) && m.did?.includes(userTopic);
        });

        if (!currentRAMessage) {
            throw new Error('User not found');
        }

        const RAMessages = await this.readTopicMessages(
            currentRAMessage.registrantTopicId
        );

        // Restore account
        const didDocumentMessage = this.findMessageByType(
            MessageType.DIDDocument,
            RAMessages
        );
        const vcDocumentMessage = this.findMessageByType(
            MessageType.VCDocument,
            RAMessages
        );

        if (!didDocumentMessage) {
            throw new Error('Couldn\'t find DID document');
        }

        await new DataBaseHelper(DidDocumentCollection).save({
            did: didDocumentMessage.document.id,
            document: didDocumentMessage.document,
            status: DidDocumentStatus.CREATE,
            messageId: didDocumentMessage.id,
            topicId: didDocumentMessage.topicId,
        });

        if (vcDocumentMessage) {
            const vcDoc = VcDocument.fromJsonTree(vcDocumentMessage.document);
            await new DataBaseHelper(VcDocumentCollection).save({
                hash: vcDoc.toCredentialHash(),
                owner: didDocumentMessage.document.id,
                document: vcDoc.toJsonTree(),
                type: 'STANDARD_REGISTRY',
            });
        }

        await this.users.updateCurrentUser(username, {
            did: didDocumentMessage.document.id,
            parent: undefined,
            hederaAccountId: hederaAccountID,
        });

        await this.restoreTopic(
            {
                topicId: currentRAMessage.registrantTopicId,
                name: RAMessages[0].name,
                description: RAMessages[0].description,
                owner: didDocumentMessage.document.id,
                type: TopicType.UserTopic,
                policyId: null,
                policyUUID: null,
            },
            user,
            hederaAccountKey,
            hederaAccountKey
        );

        await this.wallet.setKey(
            user.walletToken,
            KeyType.KEY,
            didDocumentMessage.document.id,
            hederaAccountKey
        );

        // Restore policies
        for (const policyMessage of this.findMessagesByType(
            MessageType.Policy,
            RAMessages
        )) {
            await this.restorePolicy(
                policyMessage.policyTopicId,
                didDocumentMessage.document.id,
                user,
                hederaAccountID,
                hederaAccountKey
            );
        }
    }
}
