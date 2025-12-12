import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUtils } from '../helpers/utils.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyGetData } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { BlockActionError } from '../errors/index.js';
import { MessageAction, PolicyRoles, VcDocument as VcDocumentCollection, VcDocumentDefinition as VcDocument, VcHelper, VPMessage, } from '@guardian/common';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { Inject } from '../../helpers/decorators/inject.js';
import { DocumentCategoryType, LocationType } from '@guardian/interfaces';
import { PolicyActionsUtils } from '../policy-actions/utils.js';

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
    actionType: LocationType.REMOTE,
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
    declare private vcHelper: VcHelper;

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
     * @param {PolicyUser} user
     * @param {AnyBlockType} parent
     */
    public async joinData<T extends IPolicyDocument | IPolicyDocument[]>(
        documents: T,
        user: PolicyUser,
        parent: AnyBlockType
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
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const data: IPolicyGetData = {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
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
    async setData(user: PolicyUser, blockData: any, _, actionStatus): Promise<any> {
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
            await ref.databaseServer.setMultiSigStatus(
                ref.uuid,
                ref.policyId,
                documentId,
                user.group,
                DocumentStatus.NEW
            );
        }
        const documentStatus = await ref.databaseServer.getMultiSignStatus(ref.uuid, documentId, user.id);
        if (documentStatus) {
            throw new BlockActionError('The document has already been signed', ref.blockType, ref.uuid);
        }

        const groupContext = await PolicyUtils.getGroupContext(ref, user);
        const vcDocument = sourceDoc.document;
        const credentialSubject = vcDocument.credentialSubject[0];
        const uuid = await ref.components.generateUUID();
        const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, sourceDoc, user.userId);

        const newVC = await PolicyActionsUtils
            .signVC({
                ref,
                subject: credentialSubject,
                issuer: user.did,
                relayerAccount,
                options: { uuid, group: groupContext },
                userId: user.userId
            });

        await ref.databaseServer.setMultiSigDocument(
            ref.uuid,
            ref.policyId,
            documentId,
            user,
            status === DocumentStatus.SIGNED ? DocumentStatus.SIGNED : DocumentStatus.DECLINED,
            newVC.toJsonTree()
        );

        const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);
        await this.updateThreshold(users, sourceDoc, documentId, user, user.userId, actionStatus);

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null, actionStatus);

        PolicyComponentsUtils.BlockUpdateFn(ref.parent, user);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            documents: ExternalDocuments(document)
        }));
        ref.backup();
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
        currentUser: PolicyUser,
        userId: string | null,
        actionStatus: any
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
            const docOwner = await PolicyUtils.getDocumentOwner(ref, sourceDoc, userId);
            const policyOwnerCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
            const policyOwnerDocument = await policyOwnerCred.loadDidDocument(ref, userId);
            const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, sourceDoc, userId);

            const vcs = data.map(e => VcDocument.fromJsonTree(e.document));
            const uuid: string = await ref.components.generateUUID();
            const vp = await this.vcHelper.createVerifiablePresentation(
                vcs,
                policyOwnerDocument,
                null,
                { uuid }
            );

            const vpMessage = new VPMessage(MessageAction.CreateVP);
            vpMessage.setDocument(vp);
            vpMessage.setRelationships(sourceDoc.messageId ? [sourceDoc.messageId] : []);
            vpMessage.setTag(ref);
            vpMessage.setEntityType(ref);
            vpMessage.setOption(null, ref);
            vpMessage.setUser(null);
            const topic = await PolicyUtils.getPolicyTopic(ref, sourceDoc.topicId, userId);
            const vpMessageResult = await PolicyActionsUtils
                .sendMessage({
                    ref,
                    topic,
                    message: vpMessage,
                    owner: docOwner.did,
                    relayerAccount,
                    updateIpfs: true,
                    userId: docOwner.userId
                });

            const vpMessageId = vpMessageResult.getId();
            const vpDocument = PolicyUtils.createVP(ref, docOwner, vp, actionStatus?.id);
            vpDocument.type = DocumentCategoryType.MULTI_SIGN;
            vpDocument.messageId = vpMessageId;
            vpDocument.topicId = vpMessageResult.getTopicId();
            vpDocument.relationships = sourceDoc.messageId ? [sourceDoc.messageId] : null;
            vpDocument.relayerAccount = relayerAccount;
            await ref.databaseServer.saveVP(vpDocument);

            await ref.databaseServer.setMultiSigStatus(
                ref.uuid,
                ref.policyId,
                documentId,
                currentUser.group,
                DocumentStatus.SIGNED
            );

            const state: IPolicyEventState = { data: sourceDoc };
            ref.triggerEvents(PolicyOutputEventType.SignatureQuorumReachedEvent, currentUser, state, actionStatus);
            PolicyComponentsUtils.ExternalEventFn(
                new ExternalEvent(ExternalEventType.SignatureQuorumReachedEvent, ref, null, {
                    documents: ExternalDocuments(data),
                    result: ExternalDocuments(vpDocument),
                })
            );
        } else if (declined >= declinedThreshold) {
            await ref.databaseServer.setMultiSigStatus(
                ref.uuid,
                ref.policyId,
                documentId,
                currentUser.group,
                DocumentStatus.DECLINED
            );

            const state: IPolicyEventState = { data: sourceDoc };
            ref.triggerEvents(PolicyOutputEventType.SignatureSetInsufficientEvent, currentUser, state, actionStatus);
            PolicyComponentsUtils.ExternalEventFn(
                new ExternalEvent(ExternalEventType.SignatureSetInsufficientEvent, ref, null, {
                    documents: ExternalDocuments(data)
                })
            );
        }
    }

    /**
     * Get Document Status
     * @param {IPolicyDocument} document
     * @param {PolicyUser} user
     */
    private async getDocumentStatus(document: IPolicyDocument, user: PolicyUser) {
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
     * @param {PolicyUser} user
     */
    private async onRemoveUser(event: { target: PolicyUser, user: PolicyUser, actionStatus: any }) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (event && event.target) {
            const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, event.target.group, event.target.role);
            const documents = await ref.databaseServer.getMultiSignDocumentsByGroup(ref.uuid, event.target.group);
            for (const document of documents) {
                const documentId = document.documentId;
                const vc = await ref.databaseServer.getVcDocument(documentId);
                await this.updateThreshold(users, vc, documentId, event.target, event?.user?.userId, event.actionStatus);
            }
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, null, null, event.actionStatus);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.DeleteMember, ref, event.target, null));
        }
        ref.backup();
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
