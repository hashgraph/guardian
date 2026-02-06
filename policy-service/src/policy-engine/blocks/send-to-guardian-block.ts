import { BlockActionError } from '../errors/index.js';
import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { DocumentStatus, LocationType } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { DIDMessage, HederaDidDocument, Message, MessageAction, MessageMemo, VcDocument as VcDocumentCollection, VcDocumentDefinition as VcDocument, VCMessage, VpDocument as VpDocumentCollection, VpDocumentDefinition as VpDocument, VPMessage } from '@guardian/common';
import { PolicyUtils } from '../helpers/utils.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { DocumentType } from '../interfaces/document.type.js';
import { FilterQuery } from '@mikro-orm/core';
import { PolicyActionsUtils } from '../policy-actions/utils.js';

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
    actionType: LocationType.REMOTE,
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
    },
    variables: [
        { path: 'options.topic', alias: 'topic', type: 'Topic' }
    ]
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
        if (document.draft || document.draftId) {
            old = await ref.databaseServer.getVcDocument({
                id: { $eq: document?.draftId },
                policyId: { $eq: ref.policyId },
                draft: { $eq: true }
            });
        }
        else if (document.hash) {
            old = await ref.databaseServer.getVcDocument({
                policyId: { $eq: ref.policyId },
                hash: { $eq: document.hash },
                hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
            });
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
        if (document.did) {
            old = await ref.databaseServer.getVcDocument({
                did: { $eq: document.did },
                hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
            } as FilterQuery<VcDocumentCollection>);
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
        if (document.hash) {
            old = await ref.databaseServer.getVpDocument({
                policyId: { $eq: ref.policyId },
                hash: { $eq: document.hash },
                hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
            } as FilterQuery<VpDocumentCollection>);
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
            delete document.id;
            delete document._id;
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
        ref: AnyBlockType,
        userId: string | null
    ): Promise<IPolicyDocument> {
        let old = await this.getVCRecord(document, operation, ref);
        if (old) {
            if (!document.draft) {
                delete document.draftId;
                delete old.draftId;
            }
            old = this.mapDocument(old, document);
            old = await PolicyUtils.updateVC(ref, old, userId);
        } else {
            if (!document.draft) {
                delete document.draftId;
            }
            delete document.id;
            delete document._id;
            old = await PolicyUtils.saveVC(ref, document, userId);
        }
        if (!ref.options.skipSaveState) {
            await PolicyUtils.saveDocumentState(ref, old);
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
            delete document.id;
            delete document._id;
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
            delete document.id;
            delete document._id;
            return await ref.databaseServer.saveVP(document)
        }
    }

    /**
     * Update VC message
     * @param document
     * @param ref
     */
    private async updateVCMessage(
        document: IPolicyDocument,
        ref: AnyBlockType,
        userId: string | null
    ): Promise<IPolicyDocument> {
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
            await PolicyUtils.updateVC(ref, old, userId);
            return document;
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
            await ref.databaseServer.updateDid(old);
            return document;
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
            await ref.databaseServer.updateVP(old);
            return document;
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
     * Update Message Hash
     * @param document
     * @param type
     * @param ref
     */
    private async updateMessage(
        document: IPolicyDocument,
        type: DocumentType,
        ref: AnyBlockType,
        userId: string | null
    ): Promise<IPolicyDocument> {
        if (type === DocumentType.DID) {
            return await this.updateDIDMessage(document, ref);
        } else if (type === DocumentType.VerifiableCredential) {
            return await this.updateVCMessage(document, ref, userId);
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
        ref: AnyBlockType,
        userId: string | null
    ): Promise<IPolicyDocument> {
        document.documentFields = Array.from(
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId)
        );
        switch (ref.options.dataType) {
            case 'vc-documents': {
                return await this.updateVCRecord(document, Operation.auto, ref, userId);
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
        ref: AnyBlockType,
        userId: string | null
    ): Promise<IPolicyDocument> {
        const operation: Operation = Operation.auto;
        document.documentFields = Array.from(
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId)
        );
        document.startMessageId = document.startMessageId || document.messageId;
        document.edited = false;
        if (type === DocumentType.DID) {
            return await this.updateDIDRecord(document, operation, ref);
        } else if (type === DocumentType.VerifiableCredential) {
            return await this.updateVCRecord(document, operation, ref, userId);
        } else if (type === DocumentType.VerifiablePresentation) {
            return await this.updateVPRecord(document, operation, ref);
        }
    }

    /**
     * Get topic owner
     * @param ref
     * @param document
     * @param type
     */
    private getTopicOwner(
        ref: AnyBlockType,
        document: IPolicyDocument,
        type: string
    ): string {
        let topicOwner: string = document.owner;
        if (type === 'issuer') {
            topicOwner = PolicyUtils.getDocumentIssuer(document.document);
        } else if (type === 'user') {
            topicOwner = document.owner;
        } else if (type === 'root') {
            topicOwner = ref.policyOwner;
        }
        if (!topicOwner) {
            throw new Error(`Topic owner not found`);
        }
        return topicOwner;
    }

    /**
     * Send to hedera
     * @param document
     * @param message
     * @param ref
     * @param userId
     */
    private async sendToHedera(
        document: IPolicyDocument,
        message: Message,
        ref: AnyBlockType,
        userId: string | null
    ): Promise<IPolicyDocument> {
        try {
            const memo = MessageMemo.parseMemo(true, ref.options.memo, document);
            message.setMemo(memo);

            const topicOwner = this.getTopicOwner(ref, document, ref.options.topicOwner);
            const relayerAccount = document.owner === topicOwner ? document.relayerAccount : null;
            const topic = await PolicyActionsUtils.getOrCreateTopic({
                ref,
                name: ref.options.topic,
                owner: topicOwner,
                relayerAccount,
                memoObj: document,
                userId
            });
            const vcMessageResult = await PolicyActionsUtils.sendMessage({
                ref,
                topic,
                message,
                owner: document.owner,
                relayerAccount: document.relayerAccount,
                updateIpfs: true,
                userId
            });

            document.hederaStatus = DocumentStatus.ISSUE;
            document.messageId = vcMessageResult.getId();
            document.topicId = vcMessageResult.getTopicId();
            document.startMessageId = document.startMessageId || document.messageId;

            return document;
        } catch (error) {
            throw new BlockActionError(PolicyUtils.getErrorMessage(error), ref.blockType, ref.uuid)
        }
    }

    /**
     * Document sender
     * @param document
     * @param userId
     */
    private async documentSender(
        document: IPolicyDocument,
        userId: string | null,
    ): Promise<IPolicyDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const type = PolicyUtils.getDocumentType(document);
        const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, document, userId);
        const owner = await PolicyUtils.getUserByIssuer(ref, document, userId);
        //
        // Create Message
        //
        let message: Message;
        let docObject: VcDocument | VpDocument | HederaDidDocument;
        if (type === DocumentType.DID) {
            const did = HederaDidDocument.fromJsonTree(document.document);
            const didMessage = new DIDMessage(MessageAction.CreateDID);
            didMessage.setDocument(did);
            didMessage.setRelationships(document.relationships);
            didMessage.setOwnerAccount(owner.hederaAccountId);
            message = didMessage;
            docObject = did;
        } else if (type === DocumentType.VerifiableCredential) {
            const vc = VcDocument.fromJsonTree(document.document);
            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setDocument(vc);
            vcMessage.setDocumentStatus(document.option?.status || DocumentStatus.NEW);
            vcMessage.setRelationships(document.relationships);
            vcMessage.setTag(ref);
            vcMessage.setEntityType(ref);
            vcMessage.setOption(document, ref);
            vcMessage.setUser(owner.roleMessage);
            vcMessage.setRef(document.startMessageId);
            vcMessage.setOwnerAccount(owner.hederaAccountId);
            message = vcMessage;
            docObject = vc;
        } else if (type === DocumentType.VerifiablePresentation) {
            const vp = VpDocument.fromJsonTree(document.document);
            const vpMessage = new VPMessage(MessageAction.CreateVP);
            vpMessage.setDocument(vp);
            vpMessage.setRelationships(document.relationships);
            vpMessage.setTag(ref);
            vpMessage.setEntityType(ref);
            vpMessage.setOption(document, ref);
            vpMessage.setUser(owner.roleMessage);
            vpMessage.setOwnerAccount(owner.hederaAccountId);
            message = vpMessage;
            docObject = vp;
        }

        //
        // Update options
        //
        document.document = docObject.toJsonTree();
        document.policyId = ref.policyId;
        document.tag = ref.tag;
        document.relayerAccount = relayerAccount;
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
                document = await this.sendToHedera(document, message, ref, userId);
                document.messageHash = messageHash;
                document = await this.updateMessage(document, type, ref, userId);
            } else {
                document.hash = hash;
                document = await this.sendByType(document, ref, userId);
            }
        } else if (ref.options.dataSource === 'auto' || !ref.options.dataSource) {
            if (document.messageHash !== messageHash) {
                document = await this.sendToHedera(document, message, ref, userId);
                document.messageHash = messageHash;
            }
            document.hash = hash;
            document = await this.sendToDatabase(document, type, ref, userId);
        } else if (ref.options.dataSource === 'database') {
            document.hash = hash;
            document = await this.sendToDatabase(document, type, ref, userId);
        } else if (ref.options.dataSource === 'hedera') {
            document = await this.sendToHedera(document, message, ref, userId);
            document.messageHash = messageHash;
            document = await this.updateMessage(document, type, ref, userId);
        } else {
            throw new BlockActionError(`dataSource "${ref.options.dataSource}" is unknown`, ref.blockType, ref.uuid);
        }
        return document;
    }

    /**
     * Document sender
     * @param document
     * @param userId
     */
    private async updateVersion(
        document: IPolicyDocument,
        userId: string | null
    ): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const old = await ref.databaseServer.getVcDocument(document.id);

        if (old && old.policyId === ref.policyId) {
            old.edited = true;
            await PolicyUtils.updateVC(ref, old, userId);
        }
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

        const tags = await PolicyUtils.getBlockTags(ref);

        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;
        if (Array.isArray(docs)) {
            const newDocs = [];
            for (const doc of docs) {
                PolicyUtils.setDocumentTags(doc, tags);
                const newDoc = await this.documentSender(doc, event?.user?.userId);
                newDocs.push(newDoc);
            }
            event.data.data = newDocs;
        } else {
            PolicyUtils.setDocumentTags(docs, tags);
            event.data.data = await this.documentSender(docs, event?.user?.userId);
        }

        const olds: IPolicyDocument | IPolicyDocument[] = event.data.old;
        if (Array.isArray(olds)) {
            for (const old of olds) {
                await this.updateVersion(old, event?.user?.userId);
            }
        } else if (olds) {
            await this.updateVersion(olds, event?.user?.userId);
        }

        // event.actionStatus.saveResult(event.data);
        await ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            type: (ref.options.dataSource || ref.options.dataType),
            documents: ExternalDocuments(event.data?.data),
        }));

        ref.backup();

        return event.data;
    }
}
