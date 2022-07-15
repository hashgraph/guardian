import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { DocumentStatus } from '@guardian/interfaces';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { AnyBlockType, IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { MessageAction, MessageServer, VcDocument as HVcDocument, VCMessage } from '@hedera-modules';
import { getMongoRepository } from 'typeorm';
import { ApprovalDocument } from '@entity/approval-document';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IAuthUser } from '@guardian/common';

/**
 * Send to guardian
 */
@BasicBlock({
    blockType: 'sendToGuardianBlock',
    commonBlock: true,
    publishExternalEvent: true,
    about: {
        label: 'Send',
        title: `Add 'Send' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class SendToGuardianBlock {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Send by type
     * @deprecated 2022-08-04
     */
    async sendByType(document: any, currentUser: IAuthUser, ref: AnyBlockType) {
        let result: any;
        switch (ref.options.dataType) {
            case 'vc-documents': {
                const vc = HVcDocument.fromJsonTree(document.document);
                const doc: any = PolicyUtils.createVCRecord(
                    ref.policyId,
                    ref.tag,
                    ref.options.entityType,
                    vc,
                    document
                );
                result = await PolicyUtils.updateVCRecord(doc);
                break;
            }
            case 'did-documents': {
                result = await PolicyUtils.updateDIDRecord(document);
                break;
            }
            case 'approve': {
                let item: ApprovalDocument;
                if (document.id) {
                    item = await getMongoRepository(ApprovalDocument).findOne(document.id);
                }
                if (item) {
                    item.owner = document.owner;
                    item.option = document.option;
                    item.schema = document.schema;
                    item.document = document.document;
                    item.tag = document.tag;
                    item.type = document.type;
                } else {
                    item = getMongoRepository(ApprovalDocument).create(document as ApprovalDocument);
                }
                result = await getMongoRepository(ApprovalDocument).save(item);
                break;
            }
            case 'hedera': {
                result = await this.sendToHedera(document, currentUser, ref);
                break;
            }
            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        return result;
    }

    /**
     * Send document
     * @param document
     * @param currentUser
     * @param ref
     */
    async send(document: any, currentUser: IAuthUser, ref: IPolicyBlock) {
        const { dataSource } = ref.options;

        let result: any;
        switch (dataSource) {
            case 'database': {
                result = await this.sendToDatabase(document, currentUser, ref);
                break;
            }
            case 'hedera': {
                result = await this.sendToHedera(document, currentUser, ref);
                break;
            }
            default:
                throw new BlockActionError(`dataSource "${dataSource}" is unknown`, ref.blockType, ref.uuid)
        }

        return result;
    }

    /**
     * Send to database
     * @param document
     * @param currentUser
     * @param ref
     */
    async sendToDatabase(document: any, currentUser: IAuthUser, ref: IPolicyBlock) {
        let { documentType } = ref.options;
        if (documentType === 'document') {
            const doc = document?.document;
            if (doc && doc.verificationMethod) {
                documentType = 'did';
            } else if (doc.type && doc.type.includes('VerifiablePresentation')) {
                documentType = 'vp';
            } else if (doc.type && doc.type.includes('VerifiableCredential')) {
                documentType = 'vc';
            }
        }

        switch (documentType) {
            case 'vc': {
                const vc = HVcDocument.fromJsonTree(document.document);
                const doc: any = PolicyUtils.createVCRecord(
                    ref.policyId,
                    ref.tag,
                    ref.options.entityType,
                    vc,
                    document
                );
                return await PolicyUtils.updateVCRecord(doc);
            }
            case 'did': {
                return await PolicyUtils.updateDIDRecord(document);
            }
            case 'vp': {
                return await PolicyUtils.updateVPRecord(document);
            }
            default:
                throw new BlockActionError(`documentType "${documentType}" is unknown`, ref.blockType, ref.uuid)
        }
    }

    /**
     * Send to hedera
     * @param document
     * @param currentUser
     * @param ref
     */
    async sendToHedera(document: any, currentUser: IAuthUser, ref: IPolicyBlock) {
        try {
            const root = await this.users.getHederaAccount(ref.policyOwner);
            const user = await this.users.getHederaAccount(document.owner);

            let topicOwner = user;
            if (ref.options.topicOwner === 'user') {
                topicOwner = await this.users.getHederaAccount(currentUser.did);
            } else if (ref.options.topicOwner === 'issuer') {
                topicOwner = await this.users.getHederaAccount(document.document.issuer);
            } else {
                topicOwner = user;
            }
            if (!topicOwner) {
                throw new Error(`Topic owner not found`);
            }

            const topic = await PolicyUtils.getTopic(ref.options.topic, root, topicOwner, ref);
            const vc = HVcDocument.fromJsonTree(document.document);
            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setStatus(document.option?.status || DocumentStatus.NEW);
            vcMessage.setDocument(vc);
            vcMessage.setRelationships(document.relationships);
            const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey);
            const vcMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(vcMessage);
            document.hederaStatus = DocumentStatus.ISSUE;
            document.messageId = vcMessageResult.getId();
            document.topicId = vcMessageResult.getTopicId();
            return document;
        } catch (error) {
            throw new BlockActionError(error.message, ref.blockType, ref.uuid)
        }
    }

    /**
     * Document sender
     * @param document
     * @param user
     */
    async documentSender(document: any, user: IAuthUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        document.policyId = ref.policyId;
        document.tag = ref.tag;
        document.type = ref.options.entityType || document.type;

        if (ref.options.forceNew) {
            document = { ...document };
            document.id = undefined;
        }
        if (ref.options.options) {
            document.option = document.option || {};
            for (const option of ref.options.options) {
                document.option[option.name] = option.value;
            }
        }

        ref.log(`Send Document: ${JSON.stringify(document)}`);

        if (ref.options.dataType) {
            document = await this.sendByType(document, user, ref);
        } else {
            document = await this.send(document, user, ref);
        }

        return document;
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);

        const docs: any | any[] = event.data.data;
        if (Array.isArray(docs)) {
            const newDocs = [];
            for (const doc of docs) {
                const newDoc = await this.documentSender(doc, event.user);
                newDocs.push(newDoc);
            }
            event.data.data = newDocs;
        } else {
            event.data.data = await this.documentSender(docs, event.user);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
    }

    /**
     * Validate block data
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.dataType) {
                if (!['vc-documents', 'did-documents', 'approve', 'hedera'].find(item => item === ref.options.dataType)) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "dataType" must be one of vc-documents, did-documents, approve, hedera');
                }
            }

            if (ref.options.dataSource === 'database') {
                if (!['vc', 'did', 'vp', 'document'].find(item => item === ref.options.documentType)) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "documentType" must be one of vc, did, vp');
                }
            }
            if (ref.options.dataSource === 'hedera') {
                if (ref.options.topic && ref.options.topic !== 'root') {
                    const policyTopics = ref.policyInstance.policyTopics || [];
                    const config = policyTopics.find(e => e.name === ref.options.topic);
                    if (!config) {
                        resultsContainer.addBlockError(ref.uuid, `Topic "${ref.options.topic}" does not exist`);
                    }
                }
            }
            if (!ref.options.dataSource && !ref.options.dataType) {
                resultsContainer.addBlockError(ref.uuid, 'Option "dataSource" must be one of database, hedera');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
