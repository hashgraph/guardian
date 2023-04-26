import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';
import { BlockActionError } from '@policy-engine/errors';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import {
    PolicyRoles,
    VcDocument as VcDocumentCollection,
    MessageAction,
    MessageServer,
    VcHelper,
    VcDocumentDefinition as VcDocument,
    VPMessage,
} from '@guardian/common';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { Inject } from '@helpers/decorators/inject';

/**
 * Sign Status
 */
enum DocumentStatus {
    NEW = 'NEW',
    SIGNED = 'SIGNED',
    DECLINED = 'DECLINED',
}

/**
 * Switch block
 */
@EventBlock({
    blockType: 'multiSignBlock',
    commonBlock: true,
    about: {
        label: 'Multiple Signature',
        title: `Add 'Multiple Signature' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
        ],
        output: [
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.SignatureQuorumReachedEvent,
            PolicyOutputEventType.SignatureSetInsufficientEvent
        ],
        defaultEvent: false,
        properties: [{
            name: 'threshold',
            label: 'Threshold (%)',
            title: 'Number of signatures required to move to the next step, as a percentage of the total number of users in the group.',
            type: PropertyType.Input,
            default: '50'
        }]
    },
    variables: []
})
export class MultiSignBlock {
    /**
     * VC helper
     * @private
     */
    @Inject()
    private readonly vcHelper: VcHelper;

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        ref.addInternalListener('remove-user', this.onRemoveUser.bind(this));
    }

    /**
     * Join GET Data
     * @param {IPolicyDocument | IPolicyDocument[]} documents
     * @param {IPolicyUser} user
     * @param {AnyBlockType} parent
     */
    public async joinData<T extends IPolicyDocument | IPolicyDocument[]>(
        documents: T, user: IPolicyUser, parent: AnyBlockType
    ): Promise<T> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const getData = await this.getData(user);
        if (Array.isArray(documents)) {
            for (const doc of documents) {
                if (!doc.blocks) {
                    doc.blocks = {};
                }
                const status = await this.getDocumentStatus(doc, user);
                doc.blocks[ref.uuid] = { ...getData, status };
            }
        } else {
            if (!documents.blocks) {
                documents.blocks = {};
            }
            const status = await this.getDocumentStatus(documents, user);
            documents.blocks[ref.uuid] = { ...getData, status };
        }
        return documents;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const data: any = {
            id: ref.uuid,
            blockType: ref.blockType,
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            user: ref.options.user
        }
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(user: IPolicyUser, blockData: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const { status, document } = blockData;
        const documentId = document.id;
        const sourceDoc = await ref.databaseServer.getVcDocument(documentId);

        if (!sourceDoc) {
            throw new BlockActionError(`Invalid document`, ref.blockType, ref.uuid);
        }

        const confirmationStatus = await ref.databaseServer.getMultiSignStatus(ref.uuid, documentId);
        if (confirmationStatus) {
            if (confirmationStatus.status !== DocumentStatus.NEW) {
                throw new BlockActionError('The document has already been signed', ref.blockType, ref.uuid);
            }
        } else {
            await ref.databaseServer.setMultiSigStatus(ref.uuid, documentId, user.group, DocumentStatus.NEW);
        }
        const documentStatus = await ref.databaseServer.getMultiSignStatus(ref.uuid, documentId, user.id);
        if (documentStatus) {
            throw new BlockActionError('The document has already been signed', ref.blockType, ref.uuid);
        }

        const root = await PolicyUtils.getHederaAccount(ref, user.did);
        const groupContext = await PolicyUtils.getGroupContext(ref, user);
        const vcDocument = sourceDoc.document;
        const credentialSubject = vcDocument.credentialSubject[0];
        const newVC = await this.vcHelper.createVC(
            root.did,
            root.hederaAccountKey,
            credentialSubject,
            groupContext
        );

        await ref.databaseServer.setMultiSigDocument(
            ref.uuid,
            documentId,
            user,
            status === DocumentStatus.SIGNED ? DocumentStatus.SIGNED : DocumentStatus.DECLINED,
            newVC.toJsonTree()
        );

        const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);
        await this.updateThreshold(users, sourceDoc, documentId, user);

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null);
        PolicyComponentsUtils.BlockUpdateFn(ref.parent, {}, user, ref.tag);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            documents: ExternalDocuments(document)
        }));
    }

    /**
     * Check threshold
     * @param users
     * @param sourceDoc
     * @param documentId
     * @param currentUser
     */
    private async updateThreshold(
        users: PolicyRoles[],
        sourceDoc: VcDocumentCollection,
        documentId: string,
        currentUser: IPolicyUser
    ) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const data = await ref.databaseServer.getMultiSignDocuments(ref.uuid, documentId, currentUser.group);

        let signed = 0;
        let declined = 0;
        for (const u of data) {
            if (u.status === DocumentStatus.SIGNED) {
                signed++;
            } else if (u.status === DocumentStatus.DECLINED) {
                declined++;
            }
        }

        const signedThreshold = Math.ceil(users.length * ref.options.threshold / 100);
        const declinedThreshold = Math.round(users.length - signedThreshold + 1);

        if (signed >= signedThreshold) {
            const docOwner = PolicyUtils.getDocumentOwner(ref, sourceDoc);
            const policyOwnerAccount = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
            const documentOwnerAccount = await PolicyUtils.getHederaAccount(ref, docOwner.did);

            const vcs = data.map(e => VcDocument.fromJsonTree(e.document));
            const vp = await this.vcHelper.createVP(
                policyOwnerAccount.did,
                policyOwnerAccount.hederaAccountKey,
                vcs,
                GenerateUUIDv4()
            );

            const vpMessage = new VPMessage(MessageAction.CreateVP);
            vpMessage.setDocument(vp);
            vpMessage.setRelationships(sourceDoc.messageId ? [sourceDoc.messageId] : []);
            const topic = await PolicyUtils.getPolicyTopic(ref, sourceDoc.topicId);
            const messageServer = new MessageServer(
                documentOwnerAccount.hederaAccountId,
                documentOwnerAccount.hederaAccountKey,
                ref.dryRun
            );

            const vpMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(vpMessage);
            const vpMessageId = vpMessageResult.getId();
            const vpDocument = PolicyUtils.createVP(ref, docOwner, vp);
            vpDocument.type = DataTypes.MULTI_SIGN;
            vpDocument.messageId = vpMessageId;
            vpDocument.topicId = vpMessageResult.getTopicId();
            await ref.databaseServer.saveVP(vpDocument);

            await ref.databaseServer.setMultiSigStatus(ref.uuid, documentId, currentUser.group, DocumentStatus.SIGNED);

            ref.triggerEvents(PolicyOutputEventType.SignatureQuorumReachedEvent, currentUser, { data: sourceDoc });
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.SignatureQuorumReachedEvent, ref, null, {
                documents: ExternalDocuments(data),
                result: ExternalDocuments(vpDocument),
            }));
        } else if (declined >= declinedThreshold) {
            await ref.databaseServer.setMultiSigStatus(ref.uuid, documentId, currentUser.group, DocumentStatus.DECLINED);
            ref.triggerEvents(PolicyOutputEventType.SignatureSetInsufficientEvent, currentUser, { data: sourceDoc });
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.SignatureSetInsufficientEvent, ref, null, {
                documents: ExternalDocuments(data)
            }));
        }
    }

    /**
     * Get Document Status
     * @param {IPolicyDocument} document
     * @param {IPolicyUser} user
     */
    private async getDocumentStatus(document: IPolicyDocument, user: IPolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const confirmationDocument = await ref.databaseServer.getMultiSignStatus(ref.uuid, document.id);
        const data: any[] = await ref.databaseServer.getMultiSignDocuments(ref.uuid, document.id, user.group);
        const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);

        let signed = 0;
        let declined = 0;
        let documentStatus = DocumentStatus.NEW;
        for (const u of data) {
            if (u.userId === user.id) {
                documentStatus = u.status;
            }
            if (u.status === DocumentStatus.SIGNED) {
                signed++;
            }
            if (u.status === DocumentStatus.DECLINED) {
                declined++;
            }
        }

        let confirmationStatus: string = null;
        if (confirmationDocument && confirmationDocument.status !== DocumentStatus.NEW) {
            confirmationStatus = confirmationDocument.status;
        }

        const threshold = ref.options.threshold;
        const total = users.length;
        const signedThreshold = Math.ceil(users.length * threshold / 100);
        const declinedThreshold = Math.round(users.length - signedThreshold + 1);
        const result = {
            documentStatus,
            confirmationStatus,
            data,
            total,
            signedCount: signed,
            signedPercent: (signed / total) * 100,
            declinedCount: declined,
            declinedPercent: (declined / total) * 100,
            threshold,
            signedThreshold,
            declinedThreshold
        }

        return result;
    }

    /**
     * Remove User Event
     * @param {IPolicyUser} user
     */
    private async onRemoveUser(user: IPolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (user) {
            const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);
            const documents = await ref.databaseServer.getMultiSignDocumentsByGroup(ref.uuid, user.group);
            for (const document of documents) {
                const documentId = document.documentId;
                const vc = await ref.databaseServer.getVcDocument(documentId);
                await this.updateThreshold(users, vc, documentId, user);
            }
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, null, null);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.DeleteMember, ref, user, null));
        }
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        return;
    }
}
