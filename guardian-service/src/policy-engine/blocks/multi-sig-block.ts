import { ActionCallback, BasicBlock, EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { PropertyBuilder } from '@policy-engine/helpers/property-builder';
import { IPolicyUser } from '@policy-engine/policy-user';
import { BlockActionError } from '@policy-engine/errors';

enum DocumentStatus {
    NEW = 'NEW',
    SIGNED = 'SIGNED',
    DECLINED = 'DECLINED',
}

/**
 * Switch block
 */
@EventBlock({
    blockType: 'multiSigBlock',
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
export class MultiSigBlock {
    /**
     * Join GET Data
     * @param {IPolicyDocument | IPolicyDocument[]} data
     * @param {IPolicyUser} user
     * @param {AnyBlockType} parent
     */
    public async joinData<T extends IPolicyDocument | IPolicyDocument[]>(
        documents: T, user: IPolicyUser, parent: AnyBlockType
    ): Promise<T> {
        console.log('!!!!! joinData');
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

        const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);

        const confirmationStatus = await ref.databaseServer.getMultiSigStatus(ref.uuid, document.id);

        if (confirmationStatus) {
            throw new BlockActionError('', ref.blockType, ref.uuid);
        }
        await ref.databaseServer.setMultiSigDocument(
            ref.uuid,
            document.id,
            user.id,
            status === DocumentStatus.SIGNED ? DocumentStatus.SIGNED : DocumentStatus.DECLINED
        );
        const data: any[] = await ref.databaseServer.getMultiSigDocuments(
            ref.uuid,
            document.id,
            user.id
        );

        let signed = 0;
        let declined = 0;
        for (const u of data) {
            if (u.status === DocumentStatus.SIGNED) {
                signed++;
            } else if (u.status === DocumentStatus.DECLINED) {
                declined++;
            }
        }


        const percent = users.length ? (signed / users.length) * 100 : 0;
        if (percent >= ref.options.threshold) {
            await ref.databaseServer.setMultiSigStatus(ref.uuid, document.id, DocumentStatus.SIGNED);
        }

        // ref.triggerEvents(blockData.tag, user, { data: blockData.document });
    }

    private async getDocumentStatus(document: IPolicyDocument, user: IPolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const confirmationStatus = await ref.databaseServer.getMultiSigStatus(ref.uuid, document.id);
        const data: any[] = await ref.databaseServer.getMultiSigDocuments(
            ref.uuid,
            document.id,
            user.id
        );

        const users = await ref.databaseServer.getAllUsersByRole(ref.policyId, user.group, user.role);

        const result: any = {
            threshold: ref.options.threshold,
            signed: 0,
            declined: 0,
            total: users.length,
            documentStatus: DocumentStatus.NEW,
            confirmationStatus,
            data
        }
        for (const u of data) {
            if (u.userId === user.id) {
                result.documentStatus = u.status;
            }
            if (u.status === DocumentStatus.SIGNED) {
                result.signed++;
            }
            if (u.status === DocumentStatus.DECLINED) {
                result.declined++;
            }
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
        const ref = PolicyComponentsUtils.GetBlockRef(this);
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
