import { DataSourceBlock } from '@policy-engine/helpers/decorators/data-source-block';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyAddonBlock, IPolicySourceBlock } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';

/**
 * Document source block with UI
 */
@DataSourceBlock({
    blockType: 'interfaceDocumentsSourceBlock',
    commonBlock: false,
    about: {
        label: 'Documents',
        title: `Add 'Documents Source' Block`,
        post: false,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
        ],
        output: null,
        defaultEvent: false
    }
})
export class InterfaceDocumentsSource {
    async getData(user: IAuthUser, uuid: string, queryParams: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(this);

        const blocks = ref.getFiltersAddons().map(addon => {
            return {
                id: addon.uuid,
                uiMetaData: addon.options.uiMetaData,
                blockType: addon.blockType
            }
        });

        const commonAddons = ref.getCommonAddons().map(addon => {
            return {
                id: addon.uuid,
                uiMetaData: addon.options.uiMetaData,
                blockType: addon.blockType
            }
        });

        const pagination = ref.getCommonAddons().find(addon => {
            return addon.blockType === 'paginationAddon';
        }) as IPolicyAddonBlock;

        let paginationData = null;
        if (pagination) {
            paginationData = await pagination.getState(user);
        }

        return Object.assign({
            data: await ref.getSources(user, paginationData),
            blocks,
            commonAddons
        }, ref.options.uiMetaData);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.uiMetaData && Array.isArray(ref.options.uiMetaData.fields)) {
                for (let tag of ref.options.uiMetaData.fields.map(i => i.bindBlock).filter(item => !!item)) {
                    if (!resultsContainer.isTagExist(tag)) {
                        resultsContainer.addBlockError(ref.uuid, `Tag "${tag}" does not exist`);
                    }
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
