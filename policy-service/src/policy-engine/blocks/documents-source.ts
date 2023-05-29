import { DataSourceBlock } from '@policy-engine/helpers/decorators/data-source-block';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyAddonBlock, IPolicySourceBlock } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { StateField } from '@policy-engine/helpers/decorators';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import ObjGet from 'lodash.get';

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
    },
    variables: []
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
        PolicyComponentsUtils.BlockUpdateFn(ref.parent, user);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, data));
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

        const commonAddonBlocks = ref.getCommonAddons();
        const commonAddons = commonAddonBlocks.map(addon => {
            return {
                id: addon.uuid,
                uiMetaData: addon.options.uiMetaData,
                blockType: addon.blockType
            }
        });

        const pagination = commonAddonBlocks.find(addon => {
            return addon.blockType === 'paginationAddon';
        }) as IPolicyAddonBlock;

        let paginationData = null;
        if (pagination) {
            paginationData = await pagination.getState(user);
        }

        const history = commonAddonBlocks.find((addon) => {
            return addon.blockType === 'historyAddon';
        }) as IPolicyAddonBlock;

        // Property viewHistory was deprecated in documentsSourceAddon blocks 11.02.23
        const deprecatedViewHistory = !!commonAddonBlocks
            .filter((addon) => addon.blockType === 'documentsSourceAddon')
            .find((addon) => {
                return addon.options.viewHistory;
            });

        const enableCommonSorting = ref.options.uiMetaData.enableSorting;
        const sortState = this.state[user.id] || {};
        let data: any = enableCommonSorting
            ? await this.getDataByAggregationFilters(ref, user, sortState, paginationData, deprecatedViewHistory, history)
            : await ref.getGlobalSources(user, paginationData);

        if (
            !enableCommonSorting &&
            (history || deprecatedViewHistory)
        ) {
            for (const document of data) {
                document.history = (
                    await ref.databaseServer.getDocumentStates({
                        documentId: document.id,
                    })
                ).map((state) =>
                    Object.assign(
                        {},
                        {
                            labelValue: ObjGet(
                                state.document,
                                history
                                    ? history.options.timelineLabelPath ||
                                          'option.status'
                                    : 'option.status'
                            ),
                            comment: ObjGet(
                                state.document,
                                history
                                    ? history.options.timelineDescriptionPath ||
                                          'option.comment'
                                    : 'option.comment'
                            ),
                            created: state.createDate,
                        }
                    )
                );
            }
        }

        for (const child of ref.children) {
            data = await child.joinData(data, user, ref);
        }

        return Object.assign(
            {
                data,
                blocks: filters,
                commonAddons,
            },
            Object.assign(ref.options.uiMetaData, {
                viewHistory: !!history || deprecatedViewHistory,
            }),
            sortState
        );
    }

    /**
     * Get data by aggregation filters
     * @param ref Block ref
     * @param user Policy user
     * @param sortState Sort state
     * @param paginationData Paginaton data
     * @returns Data
     */
    private async getDataByAggregationFilters(ref: IPolicySourceBlock, user: IPolicyUser, sortState: any, paginationData: any, deprecatedHistory?: boolean, history? : IPolicyAddonBlock) {
        const filtersAndDataType = await ref.getGlobalSourcesFilters(user);
        const aggregation = [...filtersAndDataType.filters, {
            $match: {
                '__sourceTag__': { $ne: null }
            }
        }, {
            $set: {
                'option': {
                    $cond: {
                        if: {
                            $or: [
                                { $eq: [null, '$newOption'] },
                                { $not: '$newOption' }
                            ]
                        },
                        then: '$option',
                        else: '$newOption'
                    }
                }
            }
        }, {
            $unset: 'newOptions',
        }];

        if (history || deprecatedHistory) {
            aggregation.push({
                $lookup: {
                    from: `${
                        ref.databaseServer.getDryRun()
                            ? 'dry_run'
                            : 'document_state'
                    }`,
                    localField: 'id',
                    foreignField: 'documentId',
                    pipeline: [
                        {
                            $set: {
                                labelValue: history
                                    ? '$document.' +
                                      (history.options.timelineLabelPath ||
                                          'option.status')
                                    : '$document.option.status',
                                comment: history
                                    ? '$document.' +
                                      (history.options
                                          .timelineDescriptionPath ||
                                          'option.comment')
                                    : '$document.option.comment',
                                created: '$createDate',
                            },
                        },
                    ],
                    as: 'history',
                },
            });
        }

        if (sortState.orderField && sortState.orderDirection) {
            const sortObject = {};
            switch (sortState.orderDirection.toLowerCase()) {
                case 'asc':
                    sortObject[sortState.orderField] = 1;
                    break;
                case 'desc':
                    sortObject[sortState.orderField] = -1;
                    break;
                default:
                    sortObject[sortState.orderField] = 1;
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
            });
        }

        switch (filtersAndDataType.dataType) {
            case 'vc-documents':
                aggregation.unshift({
                    $match: {
                        policyId: { $eq: ref.policyId }
                    }
                });
                return await ref.databaseServer.getVcDocumentsByAggregation(aggregation);
            case 'did-documents':
                return await ref.databaseServer.getDidDocumentsByAggregation(aggregation);
            case 'vp-documents':
                aggregation.unshift({
                    $match: {
                        policyId: { $eq: ref.policyId }
                    }
                });
                return await ref.databaseServer.getVpDocumentsByAggregation(aggregation);
            case 'approve':
                aggregation.unshift({
                    $match: {
                        policyId: { $eq: ref.policyId }
                    }
                });
                return await ref.databaseServer.getApprovalDocumentsByAggregation(aggregation);
            default:
                return [];
        }
    }
}
