import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { DocumentStatus } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import {
    MessageAction,
    MessageServer,
    VcDocument,
    VpDocument,
    DIDDocument,
    VCMessage,
    MessageMemo,
    VPMessage,
    DIDMessage,
    Message
} from '@hedera-modules';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { DocumentType } from '@policy-engine/interfaces/document.type';

/**
 * Document Operations
 */
enum Operation {
    auto = 'auto',
    create = 'create',
    updateById = 'update-by-id',
    updateByMessage = 'update-by-message',
}

/**
 * Send to guardian
 */
@BasicBlock({
    blockType: 'sendToGuardianBlock',
    commonBlock: true,
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
     * Update item prop
     * @param old
     * @param doc
     */
    private mapDocument(old: IPolicyDocument, doc: IPolicyDocument): IPolicyDocument {
        for (const key in doc) {
            if (key !== 'id' && key !== '_id' && typeof doc[key] !== 'function') {
                old[key] = doc[key];
            }
        }
        return old;
    }

    /**
     * Get VC record
     * @param document
     * @param operation
     * @param ref
     */
    private async getVCRecord(document: IPolicyDocument, operation: Operation, ref: AnyBlockType): Promise<any> {
        let old: any = null;
        if (operation === Operation.auto) {
            if (document.hash) {
                old = await ref.databaseServer.getVcDocument({
                    where: {
                        hash: { $eq: document.hash },
                        hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                    }
                });
            }
        } else if (operation === Operation.updateById) {
            if (document.id || document._id) {
                old = await ref.databaseServer.getVcDocument(document.id || document._id);
            }

        } else if (operation === Operation.updateByMessage) {
            if (document.messageId) {
                old = await ref.databaseServer.getVcDocument({
                    where: {
                        messageId: { $eq: document.messageId },
                        hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                    }
                });
            }
        }
        return old;
    }

    /**
     * Get Approval record
     * @param document
     * @param operation
     * @param ref
     */
    private async getApprovalRecord(document: IPolicyDocument, operation: Operation, ref: AnyBlockType): Promise<any> {
        let old: any;
        if (document.id || document._id) {
            old = await ref.databaseServer.getApprovalDocument(document.id || document._id);
        }
        return old;
    }

    /**
     * Get did record
     * @param document
     * @param operation
     * @param ref
     */
    private async getDIDRecord(document: IPolicyDocument, operation: Operation, ref: AnyBlockType): Promise<any> {
        let old: any = null;
        if (operation === Operation.auto) {
            if (document.did) {
                old = await ref.databaseServer.getVcDocument({
                    where: {
                        did: { $eq: document.did },
                        hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                    }
                });
            }
        } else if (operation === Operation.updateById) {
            if (document.id || document._id) {
                old = await ref.databaseServer.getVcDocument(document.id || document._id);
            }

        } else if (operation === Operation.updateByMessage) {
            if (document.messageId) {
                old = await ref.databaseServer.getVcDocument({
                    where: {
                        messageId: { $eq: document.messageId },
                        hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                    }
                });
            }
        }
        return old;
    }

    /**
     * Get VP record
     * @param document
     * @param operation
     * @param ref
     */
    private async getVPRecord(document: IPolicyDocument, operation: Operation, ref: AnyBlockType): Promise<any> {
        let old: any = null;
        if (operation === Operation.auto) {
            if (document.hash) {
                old = await ref.databaseServer.getVcDocument({
                    where: {
                        hash: { $eq: document.hash },
                        hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                    }
                });
            }
        } else if (operation === Operation.updateById) {
            if (document.id || document._id) {
                old = await ref.databaseServer.getVcDocument(document.id || document._id);
            }

        } else if (operation === Operation.updateByMessage) {
            if (document.messageId) {
                old = await ref.databaseServer.getVcDocument({
                    where: {
                        messageId: { $eq: document.messageId },
                        hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                    }
                });
            }
        }
        return old;
    }

    /**
     * Update Approval record
     * @param document
     * @param operation
     * @param ref
     */
    private async updateApprovalRecord(
        document: IPolicyDocument,
        operation: Operation,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        let old = await this.getApprovalRecord(document, operation, ref);
        if (old) {
            old = this.mapDocument(old, document);
            return await ref.databaseServer.updateApproval(old);
        } else {
            return await ref.databaseServer.saveApproval(document)
        }
    }

    /**
     * Update VC record
     * @param document
     * @param operation
     * @param ref
     */
    private async updateVCRecord(
        document: IPolicyDocument,
        operation: Operation,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        let old = await this.getVCRecord(document, operation, ref);

        let updateStatus = false;
        if (old) {
            updateStatus = old.option?.status !== document.option?.status;
            old = this.mapDocument(old, document);
            old = await ref.databaseServer.updateVC(old);
            console.log(`   -- update vc`);
        } else {
            updateStatus = !!document.option?.status;
            old = await ref.databaseServer.saveVC(document);
            console.log(`   -- save vc`);
        }

        if (updateStatus) {
            await ref.databaseServer.saveDocumentState({
                documentId: old.id,
                status: old.option.status,
                reason: old.comment
            });
        }
        return old;
    }

    /**
     * Update did record
     * @param document
     * @param operation
     * @param ref
     */
    private async updateDIDRecord(
        document: IPolicyDocument,
        operation: Operation,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        let old = await this.getDIDRecord(document, operation, ref);
        if (old) {
            old = this.mapDocument(old, document);
            return await ref.databaseServer.updateDid(old);
        } else {
            return await ref.databaseServer.saveDid(document)
        }
    }

    /**
     * Update VP record
     * @param document
     * @param operation
     * @param ref
     */
    private async updateVPRecord(
        document: IPolicyDocument,
        operation: Operation,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        let old = await this.getVPRecord(document, operation, ref);
        if (old) {
            old = this.mapDocument(old, document);
            return await ref.databaseServer.updateVP(old);
        } else {
            return await ref.databaseServer.saveVP(document)
        }
    }

    /**
     * Update VC message
     * @param document
     * @param ref
     */
    private async updateVCMessage(document: IPolicyDocument, ref: AnyBlockType): Promise<IPolicyDocument> {
        const old = await this.getVCRecord(document, Operation.auto, ref);
        if (old) {
            old.hederaStatus = document.hederaStatus;
            old.messageId = document.messageId;
            old.topicId = document.topicId;
            old.messageHash = document.messageHash;
            if (Array.isArray(old.messageIds)) {
                old.messageIds.push(document.messageId);
            } else {
                old.messageIds = [document.messageId];
            }
            console.log(`   -- update message`);
            return await ref.databaseServer.updateVC(old);
        } else {
            if (Array.isArray(document.messageIds)) {
                document.messageIds.push(document.messageId);
            } else {
                document.messageIds = [document.messageId];
            }
            return document;
        }
    }

    /**
     * Update did message
     * @param document
     * @param ref
     *
     * @virtual
     */
    private async updateDIDMessage(document: IPolicyDocument, ref: AnyBlockType): Promise<IPolicyDocument> {
        const old = await this.getDIDRecord(document, Operation.auto, ref);
        if (old) {
            old.hederaStatus = document.hederaStatus;
            old.messageId = document.messageId;
            old.topicId = document.topicId;
            old.messageHash = document.messageHash;
            if (Array.isArray(old.messageIds)) {
                old.messageIds.push(document.messageId);
            } else {
                old.messageIds = [document.messageId];
            }
            return await ref.databaseServer.updateDid(old);
        } else {
            if (Array.isArray(document.messageIds)) {
                document.messageIds.push(document.messageId);
            } else {
                document.messageIds = [document.messageId];
            }
            return await ref.databaseServer.saveDid(document)
        }
    }

    /**
     * Update VP message
     * @param document
     * @param ref
     */
    private async updateVPMessage(document: IPolicyDocument, ref: AnyBlockType): Promise<IPolicyDocument> {
        const old = await this.getVPRecord(document, Operation.auto, ref);
        if (old) {
            old.hederaStatus = document.hederaStatus;
            old.messageId = document.messageId;
            old.topicId = document.topicId;
            old.messageHash = document.messageHash;
            if (Array.isArray(old.messageIds)) {
                old.messageIds.push(document.messageId);
            } else {
                old.messageIds = [document.messageId];
            }
            return await ref.databaseServer.updateVP(old);
        } else {
            if (Array.isArray(document.messageIds)) {
                document.messageIds.push(document.messageId);
            } else {
                document.messageIds = [document.messageId];
            }
            return await ref.databaseServer.saveVP(document)
        }
    }

    /**
     * Update Message Hash
     * @param document
     * @param type
     * @param ref
     */
    private async updateMessage(
        document: IPolicyDocument,
        type: DocumentType,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        if (type === DocumentType.DID) {
            return await this.updateDIDMessage(document, ref);
        } else if (type === DocumentType.VerifiableCredential) {
            return await this.updateVCMessage(document, ref);
        } else if (type === DocumentType.VerifiablePresentation) {
            return await this.updateVPMessage(document, ref);
        }
    }

    /**
     * Send by type
     * @param document
     * @param ref
     * @deprecated 2022-08-04
     */
    private async sendByType(
        document: IPolicyDocument,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        switch (ref.options.dataType) {
            case 'vc-documents': {
                return await this.updateVCRecord(document, Operation.auto, ref);
            }
            case 'did-documents': {
                return await this.updateDIDRecord(document, Operation.auto, ref);
            }
            case 'approve': {
                return await this.updateApprovalRecord(document, Operation.auto, ref);
            }
            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }
    }

    /**
     * Send to database
     * @param document
     * @param currentUser
     * @param ref
     */
    private async sendToDatabase(
        document: IPolicyDocument,
        type: DocumentType,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        console.log('   -- send -> database');
        let operation: Operation = Operation.auto;
        if (ref.options.dataSource === 'database') {
            if (ref.options.forceNew || ref.options.operation === 'create') {
                operation = Operation.create;
            } else {
                if (ref.options.updateBy === 'id') {
                    operation = Operation.updateById;
                }
                if (ref.options.updateBy === 'messageId') {
                    operation = Operation.updateByMessage;
                }
            }
        }
        console.log(`   -- operation: ${operation}`);

        if (type === DocumentType.DID) {
            return await this.updateDIDRecord(document, operation, ref);
        } else if (type === DocumentType.VerifiableCredential) {
            return await this.updateVCRecord(document, operation, ref);
        } else if (type === DocumentType.VerifiablePresentation) {
            return await this.updateVPRecord(document, operation, ref);
        }
    }

    /**
     * Send to hedera
     * @param document
     * @param message
     * @param ref
     */
    private async sendToHedera(
        document: IPolicyDocument,
        message: Message,
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        console.log('   -- send -> hedera');
        try {
            const root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
            const user = await PolicyUtils.getHederaAccount(ref, document.owner);

            let topicOwner = user;
            if (ref.options.topicOwner === 'user') {
                topicOwner = await PolicyUtils.getHederaAccount(ref, user.did);
            } else if (ref.options.topicOwner === 'issuer') {
                topicOwner = await PolicyUtils.getHederaAccount(ref, PolicyUtils.getDocumentIssuer(document.document));
            } else {
                topicOwner = user;
            }
            if (!topicOwner) {
                throw new Error(`Topic owner not found`);
            }
            const topic = await PolicyUtils.getOrCreateTopic(ref, ref.options.topic, root, topicOwner, document);

            const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, ref.dryRun);
            const memo = MessageMemo.parseMemo(true, ref.options.memo, document);
            const vcMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(message, true, memo);

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
    private async documentSender(document: IPolicyDocument, user: IPolicyUser): Promise<IPolicyDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const type = PolicyUtils.getDocumentType(document);

        console.log(' -- start', ref.uuid);

        //
        // Create Message
        //
        let message: Message;
        let docObject: DIDDocument | VcDocument | VpDocument;
        if (type === DocumentType.DID) {
            const did = DIDDocument.fromJsonTree(document.document);
            const didMessage = new DIDMessage(MessageAction.CreateDID);
            didMessage.setDocument(did);
            didMessage.setRelationships(document.relationships);
            message = didMessage;
            docObject = did;
        } else if (type === DocumentType.VerifiableCredential) {
            const vc = VcDocument.fromJsonTree(document.document);
            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setDocument(vc);
            vcMessage.setDocumentStatus(document.option?.status || DocumentStatus.NEW);
            vcMessage.setRelationships(document.relationships);
            message = vcMessage;
            docObject = vc;
        } else if (type === DocumentType.VerifiablePresentation) {
            const vp = VpDocument.fromJsonTree(document.document);
            const vpMessage = new VPMessage(MessageAction.CreateVP);
            vpMessage.setDocument(vp);
            vpMessage.setRelationships(document.relationships);
            message = vpMessage;
            docObject = vp;
        }

        //
        // Update options
        //
        document.document = docObject.toJsonTree();
        document.policyId = ref.policyId;
        document.tag = ref.tag;
        document.option = Object.assign({}, document.option);
        if (ref.options.options) {
            for (const option of ref.options.options) {
                document.option[option.name] = option.value;
            }
        }
        if (ref.options.entityType) {
            document.type = ref.options.entityType;
        }

        //
        // Save documents
        //
        const hash = docObject.toCredentialHash();
        const messageHash = message.toHash();
        if (ref.options.dataType) {
            if (ref.options.dataType === 'hedera') {
                document = await this.sendToHedera(document, message, ref);
                document.messageHash = messageHash;
                document = await this.updateMessage(document, type, ref);
            } else {
                document.hash = hash;
                document = await this.sendByType(document, ref);
            }
        } else if (ref.options.dataSource === 'auto' || !ref.options.dataSource) {
            if (document.messageHash !== messageHash) {
                document = await this.sendToHedera(document, message, ref);
                document.messageHash = messageHash;
            }
            document.hash = hash;
            document = await this.sendToDatabase(document, type, ref);
        } else if (ref.options.dataSource === 'database') {
            document.hash = hash;
            document = await this.sendToDatabase(document, type, ref);
        } else if (ref.options.dataSource === 'hedera') {
            document = await this.sendToHedera(document, message, ref);
            document.messageHash = messageHash;
            document = await this.updateMessage(document, type, ref);
        } else {
            throw new BlockActionError(`dataSource "${ref.options.dataSource}" is unknown`, ref.blockType, ref.uuid);
        }

        console.log(' -- end', ref.uuid);
        console.log(' ');

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
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            type: (ref.options.dataSource || ref.options.dataType),
            documents: ExternalDocuments(event.data?.data),
        }));
    }

    /**
     * Validate block data
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.dataType) {
                const t = ['vc-documents', 'did-documents', 'approve', 'hedera'];
                if (t.indexOf(ref.options.dataType) === -1) {
                    resultsContainer.addBlockError(ref.uuid, `Option "dataType" must be one of ${t.join('|')}`);
                }
            } else if (ref.options.dataSource === 'auto') {
                return;
            } else if (ref.options.dataSource === 'database') {
                if (!ref.options.operation) {
                    return;
                } else if (ref.options.operation === 'create') {
                    return;
                } else if (ref.options.operation === 'update') {
                    if (!ref.options.updateBy) {
                        return;
                    } else if (ref.options.updateBy === 'id') {
                        return;
                    } else if (ref.options.updateBy === 'hash') {
                        return;
                    } else if (ref.options.updateBy === 'messageId') {
                        return;
                    } else {
                        resultsContainer.addBlockError(ref.uuid, 'Option "updateBy" must be one of id|hash|messageId');
                    }
                } else {
                    resultsContainer.addBlockError(ref.uuid, 'Option "operation" must be one of create|update');
                }
            } else if (ref.options.dataSource === 'hedera') {
                if (ref.options.topic && ref.options.topic !== 'root') {
                    const policyTopics = ref.policyInstance.policyTopics || [];
                    const config = policyTopics.find(e => e.name === ref.options.topic);
                    if (!config) {
                        resultsContainer.addBlockError(ref.uuid, `Topic "${ref.options.topic}" does not exist`);
                    }
                }
            } else if (!ref.options.dataSource) {
                return;
            } else {
                resultsContainer.addBlockError(ref.uuid, 'Option "dataSource" must be one of auto|database|hedera');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}