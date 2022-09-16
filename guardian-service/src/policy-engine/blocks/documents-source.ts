import { DataSourceBlock } from '@policy-engine/helpers/decorators/data-source-block';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyAddonBlock, IPolicySourceBlock } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { StateField } from '@policy-engine/helpers/decorators';

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
    /**
     * Block state field
     * @private
     */
     @StateField()
     private state;

     constructor() {
         if (!this.state) {
             this.state = {};
         }
     }

    /**
     * Set block data
     * @param user
     * @param data
     */
     public async setData(user: IPolicyUser, data: any): Promise<void> {
        const oldState = this.state || {};
        oldState[user.id] = data;
        this.state = oldState;

        const ref = PolicyComponentsUtils.GetBlockRef(this);
        PolicyComponentsUtils.BlockUpdateFn(ref.parent.uuid, {}, user, ref.tag);
    }

    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    async getData(user: IPolicyUser, uuid: string, queryParams: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(this);

        const filters = ref.getFiltersAddons().map(addon => {
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

        const sortState = this.state[user.id] || {};
        let data: any = ref.options.uiMetaData.enableSorting
            ? await this.getDataByAggregationFilters(ref, user, sortState, paginationData)
            :await ref.getGlobalSources(user, paginationData);

	for (const child of ref.children) {
            data = await child.joinData(data, user, ref);
        }

        return Object.assign({
            data,
            blocks: filters,
            commonAddons
        }, ref.options.uiMetaData, sortState);
    }

    /**
     * Get data by aggregation filters
     * @param ref Block ref
     * @param user Policy user
     * @param sortState Sort state
     * @param paginationData Paginaton data
     * @returns Data
     */
    private async getDataByAggregationFilters(ref: IPolicySourceBlock, user: IPolicyUser, sortState: any, paginationData: any) {
        const filtersAndDataType = await ref.getGlobalSourcesFilters(user);
        const aggregation = [...filtersAndDataType.filters, {
            $match: {
                '__sourceTag__': { $ne: null }
            }
        }, {
            $set: {
                'historyDocumentId': {
                    $cond: {
                        if: {
                            $or: [
                                { $eq: [null, '$historyDocumentId'] },
                                { $not: '$historyDocumentId' }
                            ]
                        },
                        then: '',
                        else: '$historyDocumentId'
                    }
                }
            }
        }, {
            $lookup: {
                from: `${ref.databaseServer.getDryRun() ? 'dry_run' : 'document_state'}`,
                localField: 'historyDocumentId',
                foreignField: 'documentId',
                as: 'history'
            }
        }, {
            $set: {
                'history': {
                    $cond: {
                        if: {
                            $eq: [[], '$history']
                        },
                        then: null,
                        else: '$history'
                    }
                }
            }
        }];

        if (sortState.orderField && sortState.orderDirection) {
            const sortObject = {};
            switch(sortState.orderDirection) {
                case 'asc':
                    sortObject[sortState.orderField] = 1;
                    break;
                case 'desc':
                    sortObject[sortState.orderField] = -1;
                    break;
                default:
                    sortObject[sortState.orderField]= 1;
                    break;
            }
            aggregation.push({
                $sort: sortObject
            });
        }

        if (paginationData) {
            aggregation.push({
                $skip: paginationData.itemsPerPage * paginationData.page
            },
            {
                $limit: paginationData.itemsPerPage
            })
        }

        switch (filtersAndDataType.dataType) {
            case 'vc-documents':
                return await ref.databaseServer.getVcDocumentsByAggregation(aggregation);
            case 'did-documents':
                return await ref.databaseServer.getDidDocumentsByAggregation(aggregation);
            case 'vp-documents':
                return await ref.databaseServer.getVpDocumentsByAggregation(aggregation);
            case 'approve':
                return await ref.databaseServer.getApprovalDocumentsByAggregation(aggregation);
            default:
                return [];
        }
    }

    /**
     * Validate block data
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(this);
        try {
            if (ref.options.uiMetaData) {
                if (Array.isArray(ref.options.uiMetaData.fields)) {
                    for (const tag of ref.options.uiMetaData.fields.map(i => i.bindBlock).filter(item => !!item)) {
                        if (!resultsContainer.isTagExist(tag)) {
                            resultsContainer.addBlockError(ref.uuid, `Tag "${tag}" does not exist`);
                        }
                    }
                }
                if (ref.options.uiMetaData.enableSorting) {
                    const sourceAddons = ref.getCommonAddons().filter(addon => {
                        return addon.blockType === 'documentsSourceAddon';
                    });
                    const sourceAddonType = sourceAddons[0].options.dataType;
                    if (sourceAddons.find(item => item.options.dataType !== sourceAddonType)) {
                        resultsContainer.addBlockError(ref.uuid, `There are different types in documentSourceAddon's`);
                    }
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
