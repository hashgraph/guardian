import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { DocumentStatus } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { MessageAction, MessageServer, VcDocument as HVcDocument, VCMessage, MessageMemo } from '@hedera-modules';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

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
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    }
})
export class SendToGuardianBlock {
    /**
     * Send by type
     * @deprecated 2022-08-04
     */
    async sendByType(document: IPolicyDocument, currentUser: IPolicyUser, ref: AnyBlockType) {
        let result: any;
        switch (ref.options.dataType) {
            case 'vc-documents': {
                const vc = HVcDocument.fromJsonTree(document.document);

                const doc = PolicyUtils.cloneVC(ref, document);
                doc.type = ref.options.entityType || doc.type;
                doc.hash = vc.toCredentialHash();
                doc.document = vc.toJsonTree();

                result = await ref.databaseServer.updateVCRecord(doc);
                break;
            }
            case 'did-documents': {
                result = await ref.databaseServer.updateDIDRecord(document as any);
                break;
            }
            case 'approve': {
                result = await ref.databaseServer.updateApprovalRecord(document as any)
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
    async send(
        document: IPolicyDocument,
        currentUser: IPolicyUser,
        ref: IPolicyBlock
    ): Promise<IPolicyDocument> {
        const { dataSource } = ref.options;

        let result: IPolicyDocument;
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
    async sendToDatabase(
        document: IPolicyDocument,
        currentUser: IPolicyUser,
        ref: IPolicyBlock
    ): Promise<IPolicyDocument> {
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

                const doc = PolicyUtils.cloneVC(ref, document);
                doc.type = ref.options.entityType || doc.type;
                doc.hash = vc.toCredentialHash();
                doc.document = vc.toJsonTree();

                return await ref.databaseServer.updateVCRecord(doc);
            }
            case 'did': {
                return await ref.databaseServer.updateDIDRecord(document as any);
            }
            case 'vp': {
                return await ref.databaseServer.updateVPRecord(document as any);
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
    async sendToHedera(document: IPolicyDocument, currentUser: IPolicyUser, ref: IPolicyBlock) {
        try {
            const root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
            const user = await PolicyUtils.getHederaAccount(ref, document.owner);

            let topicOwner = user;
            if (ref.options.topicOwner === 'user') {
                topicOwner = await PolicyUtils.getHederaAccount(ref, currentUser.did);
            } else if (ref.options.topicOwner === 'issuer') {
                topicOwner = await PolicyUtils.getHederaAccount(ref, PolicyUtils.getDocumentIssuer(document.document));
            } else {
                topicOwner = user;
            }
            if (!topicOwner) {
                throw new Error(`Topic owner not found`);
            }

            const topic = await PolicyUtils.getOrCreateTopic(
                ref,
                ref.options.topic,
                root,
                topicOwner,
                document
            );
            const vc = HVcDocument.fromJsonTree(document.document);
            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setDocumentStatus(document.option?.status || DocumentStatus.NEW);
            vcMessage.setDocument(vc);
            vcMessage.setRelationships(document.relationships);
            const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, ref.dryRun);
            const vcMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(
                    vcMessage,
                    true,
                    MessageMemo.parseMemo(true, ref.options.memo, document)
                );
            document.hederaStatus = DocumentStatus.ISSUE;
            document.messageId = vcMessageResult.getId();
            document.topicId = vcMessageResult.getTopicId();
            return document;
        } catch (error) {
            throw new BlockActionError(PolicyUtils.getErrorMessage(error), ref.blockType, ref.uuid)
        }
    }

    /**
     * Document sender
     * @param document
     * @param user
     */
    async documentSender(document: IPolicyDocument, user: IPolicyUser): Promise<any> {
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
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);

        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;
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

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, null));
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
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
