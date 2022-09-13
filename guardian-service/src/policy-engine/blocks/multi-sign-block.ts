import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';
import { BlockActionError } from '@policy-engine/errors';
import { VcHelper } from '@helpers/vc-helper';
import { Inject } from '@helpers/decorators/inject';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { MessageAction, MessageServer, VcDocument, VPMessage } from '@hedera-modules';

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
            title: 'Threshold',
            type: PropertyType.Input,
            default: '50'
        }]
    }
})
export class MultiSignBlock {
    /**
     * VC helper
     * @private
     */
    @Inject()
    private readonly vcHelper: VcHelper;

    /**
     * Join GET Data
     * @param {IPolicyDocument | IPolicyDocument[]} data
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
        console.log('11');

        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const { status, document } = blockData;
        const documentId = document.id;
        const vc = await ref.databaseServer.getVcDocument(documentId);

        if (!vc) {
            throw new BlockActionError(`Invalid document`, ref.blockType, ref.uuid);
        }

        const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);
        const confirmationStatus = await ref.databaseServer.getMultiSignStatus(ref.uuid, documentId);
        console.log('1', confirmationStatus)
        if (confirmationStatus) {
            throw new BlockActionError('The document has already been signed', ref.blockType, ref.uuid);
        }
        const documentStatus = await ref.databaseServer.getMultiSignStatus(ref.uuid, documentId, user.id);
        console.log('2', documentStatus)
        if (documentStatus) {
            throw new BlockActionError('The document has already been signed', ref.blockType, ref.uuid);
        }

        const root = await PolicyUtils.getHederaAccount(ref, user.did);
        const groupContext = await PolicyUtils.getGroupContext(ref, user);
        const vcDocument = vc.document;
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

        const data = await ref.databaseServer.getMultiSignDocuments(ref.uuid, documentId);
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
        const declinedThreshold = Math.ceil(users.length * (100 - ref.options.threshold) / 100);
        if (signed >= signedThreshold) {
            const vcs = data.map(e => VcDocument.fromJsonTree(e.document));
            const vp = await this.vcHelper.createVP(
                root.did,
                root.hederaAccountKey,
                vcs,
                GenerateUUIDv4()
            );
            const vpMessage = new VPMessage(MessageAction.CreateVP);
            vpMessage.setDocument(vp);
            vpMessage.setRelationships(vc.messageId ? [vc.messageId] : []);
            const topic = await PolicyUtils.getTopicById(ref, vc.topicId);
            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
            const vpMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(vpMessage);
            const vpMessageId = vpMessageResult.getId();
            const vpDocument = PolicyUtils.createVP(ref, user, vp);
            vpDocument.type = DataTypes.MULTI_SIGN;
            vpDocument.messageId = vpMessageId;
            vpDocument.topicId = vpMessageResult.getTopicId();
            await ref.databaseServer.saveVP(vpDocument);

            await ref.databaseServer.setMultiSigStatus(ref.uuid, documentId, DocumentStatus.SIGNED);
            ref.triggerEvents(PolicyOutputEventType.SignatureQuorumReachedEvent, user, { data: vc });
        } else if (declined > declinedThreshold) {
            await ref.databaseServer.setMultiSigStatus(ref.uuid, documentId, DocumentStatus.DECLINED);
            ref.triggerEvents(PolicyOutputEventType.SignatureSetInsufficientEvent, user, { data: vc });
        }

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null);
    }

    /**
     * Get Document Status
     * @param {IPolicyDocument} document
     * @param {IPolicyUser} user
     */
    private async getDocumentStatus(document: IPolicyDocument, user: IPolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const confirmationDocument = await ref.databaseServer.getMultiSignStatus(ref.uuid, document.id);
        const data: any[] = await ref.databaseServer.getMultiSignDocuments(ref.uuid, document.id);
        const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);

        let signed = 0;
        let declined = 0;
        let documentStatus = DocumentStatus.NEW;
        for (const u of data) {
            console.log(u.userId, user.id)
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

        const confirmationStatus = confirmationDocument ? confirmationDocument.status : null;
        const threshold = ref.options.threshold;
        const total = users.length;
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
            signedThreshold: Math.ceil(total * threshold / 100),
            declinedThreshold: Math.ceil(total * (100 - threshold) / 100)
        }

        return result;
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

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!ref.options.threshold) {
                resultsContainer.addBlockError(ref.uuid, 'Option "threshold" does not set');
            } else {
                try {
                    const t = parseFloat(ref.options.threshold);
                    if (t < 0 || t > 100) {
                        resultsContainer.addBlockError(ref.uuid, '"threshold" value must be between 0 and 100');
                    }
                } catch (error) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "threshold" must be a number');
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
