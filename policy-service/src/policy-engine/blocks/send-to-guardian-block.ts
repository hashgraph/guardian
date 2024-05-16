import { BlockActionError } from '../errors/index.js';
import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { DocumentStatus } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { DIDMessage, HederaDidDocument, Message, MessageAction, MessageMemo, MessageServer, VcDocumentDefinition as VcDocument, VCMessage, VpDocumentDefinition as VpDocument, VPMessage } from '@guardian/common';
import { PolicyUtils } from '../helpers/utils.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { DocumentType } from '../interfaces/document.type.js';

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
        if (document.hash) {
            old = await ref.databaseServer.getVcDocument({
                where: {
                    policyId: { $eq: ref.policyId },
                    hash: { $eq: document.hash },
                    hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                }
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
                where: {
                    did: { $eq: document.did },
                    hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                }
            });
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
                where: {
                    policyId: { $eq: ref.policyId },
                    hash: { $eq: document.hash },
                    hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
                }
            });
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
        ref: AnyBlockType
    ): Promise<IPolicyDocument> {
        let old = await this.getVCRecord(document, operation, ref);
        if (old) {
            old = this.mapDocument(old, document);
            old = await ref.databaseServer.updateVC(old);
        } else {
            delete document.id;
            delete document._id;
            old = await ref.databaseServer.saveVC(document);
        }
        if (!ref.options.skipSaveState) {
            await ref.databaseServer.saveDocumentState({
                documentId: old.id,
                document: old
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
            await ref.databaseServer.updateVC(old);
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
        document.documentFields = Array.from(
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId)
        );
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
        const operation: Operation = Operation.auto;
        document.documentFields = Array.from(
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId)
        );
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
        try {
            const root = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
            const user = await PolicyUtils.getUserCredentials(ref, document.owner);

            let topicOwner = user;
            if (ref.options.topicOwner === 'user') {
                topicOwner = await PolicyUtils.getUserCredentials(ref, user.did);
            } else if (ref.options.topicOwner === 'issuer') {
                topicOwner = await PolicyUtils.getUserCredentials(ref, PolicyUtils.getDocumentIssuer(document.document));
            } else {
                topicOwner = user;
            }
            if (!topicOwner) {
                throw new Error(`Topic owner not found`);
            }

            const topic = await PolicyUtils.getOrCreateTopic(ref, ref.options.topic, root, topicOwner, document);

            const userHederaCred = await user.loadHederaCredentials(ref);
            const signOptions = await user.loadSignOptions(ref);
            const messageServer = new MessageServer(
                userHederaCred.hederaAccountId, userHederaCred.hederaAccountKey, signOptions, ref.dryRun
            );
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
     */
    private async documentSender(document: IPolicyDocument): Promise<IPolicyDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const type = PolicyUtils.getDocumentType(document);

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
            message = didMessage;
            docObject = did;
        } else if (type === DocumentType.VerifiableCredential) {
            const owner = await PolicyUtils.getUserByIssuer(ref, document);
            const vc = VcDocument.fromJsonTree(document.document);
            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setDocument(vc);
            vcMessage.setDocumentStatus(document.option?.status || DocumentStatus.NEW);
            vcMessage.setRelationships(document.relationships);
            vcMessage.setUser(owner.roleMessage);
            message = vcMessage;
            docObject = vc;
        } else if (type === DocumentType.VerifiablePresentation) {
            const owner = await PolicyUtils.getUserByIssuer(ref, document);
            const vp = VpDocument.fromJsonTree(document.document);
            const vpMessage = new VPMessage(MessageAction.CreateVP);
            vpMessage.setDocument(vp);
            vpMessage.setRelationships(document.relationships);
            vpMessage.setUser(owner.roleMessage);
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
                const newDoc = await this.documentSender(doc);
                newDocs.push(newDoc);
            }
            event.data.data = newDocs;
        } else {
            event.data.data = await this.documentSender(docs);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            type: (ref.options.dataSource || ref.options.dataType),
            documents: ExternalDocuments(event.data?.data),
        }));
    }
}
