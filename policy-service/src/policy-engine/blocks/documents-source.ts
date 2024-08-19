import { DataSourceBlock } from '../helpers/decorators/data-source-block.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyAddonBlock, IPolicyEventState, IPolicySourceBlock } from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyInputEventType } from '../interfaces/index.js';
import { PolicyUser } from '../policy-user.js';
import { StateField } from '../helpers/decorators/index.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import ObjGet from 'lodash.get';
import { BlockActionError } from '../errors/index.js';
import { MAP_DOCUMENT_AGGREGATION_FILTERS } from '@guardian/common';

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

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const documentCacheFields =
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId);
        ref.options?.uiMetaData?.fields
            ?.filter((field) => field?.name?.startsWith('document.'))
            .forEach((field) => {
                documentCacheFields.add(field.name.replace('document.', ''));
            });
    }

    constructor() {
        if (!this.state) {
            this.state = {};
        }
    }

    async onAddonEvent(user: PolicyUser, tag: string, documentId: string, handler: (document: any) => Promise<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(this);
        const fields = ref.options?.uiMetaData?.fields?.filter((field) =>
            field?.bindBlocks?.includes(tag)
        );
        const sourceAddons = fields
            ?.filter((field) => field.bindGroup)
            .map((field) => field.bindGroup);
        const documents = (await this._getData(user, ref, ref.options.uiMetaData.enableSorting)) as any[];
        const document = documents.find(
            // tslint:disable-next-line:no-shadowed-variable
            (document) =>
                document.id === documentId &&
                (sourceAddons.length === 0 ||
                    sourceAddons.includes(document.__sourceTag__))
        );
        if (!document) {
            throw new BlockActionError(
                'Document is not found.',
                ref.blockType,
                ref.uuid
            );
        }
        const state = await handler(document);
        ref.triggerEvents(tag, user, state);
        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Set, ref, user, {
                button: ref.tag,
                documents: ExternalDocuments(state.data),
            })
        );
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    public async setData(user: PolicyUser, data: any): Promise<void> {
        const oldState = this.state || {};
        oldState[user.id] = data;
        this.state = oldState;

        const ref = PolicyComponentsUtils.GetBlockRef(this);

        PolicyComponentsUtils.BlockUpdateFn(ref.parent, user);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, data));
    }

    private async _getData(
        user: PolicyUser,
        ref: IPolicySourceBlock,
        enableCommonSorting: boolean,
        sortState = {},
        paginationData?,
        history?
    ) {
        return enableCommonSorting
            ? await this.getDataByAggregationFilters(
                  ref,
                  user,
                  sortState,
                  paginationData,
                  history
              )
            : await ref.getGlobalSources(user, paginationData);
    }

    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    async getData(user: PolicyUser, uuid: string, queryParams: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(this);

        if (!queryParams) {
            queryParams = {};
        }

        const {itemsPerPage, page, size, filterByUUID, sortDirection, sortField, useStrict, ...filterIds} = queryParams;

        const filterAddons = ref.getFiltersAddons();
        const filters = filterAddons.map(addon => {
            return {
                id: addon.uuid,
                uiMetaData: addon.options.uiMetaData,
                blockType: addon.blockType
            }
        });

        if (filterIds) {
            for (const filterId of Object.keys(filterIds)) {
                const filterValue = filterIds[filterId];

                const filter = filterAddons.find((_filter) => {
                    return (_filter.uuid === filterId) || (_filter.tag === filterId);
                });
                if (filter) {
                    if (useStrict === 'true') {
                      await (filter as IPolicyAddonBlock).setFiltersStrict(user, {filterValue});
                    } else {
                      await (filter as IPolicyAddonBlock).setFilterState(user, {filterValue});
                    }
                }
            }
        }

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
            if ((!isNaN(page)) && (!isNaN(itemsPerPage))) {
                await pagination.setState(user, {
                    itemsPerPage: parseInt(itemsPerPage, 10),
                    page: parseInt(page, 10),
                });
            }

            paginationData = await pagination.getState(user);
        }

        const history = commonAddonBlocks.find((addon) => {
            return addon.blockType === 'historyAddon';
        }) as IPolicyAddonBlock;

        const enableCommonSorting = ref.options.uiMetaData.enableSorting || (sortDirection && sortField);
        let sortState = this.state[user.id] || {};
        if (sortDirection && sortField) {
            sortState = {
                orderDirection: sortDirection,
                orderField: sortField
            };
            this.state[user.id] = sortState;
        }
        let data: any = await this._getData(user, ref, enableCommonSorting, sortState, paginationData, history);
        if (
            !enableCommonSorting && history
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

        if (filterByUUID) {
            const doc = data.find(d => d.document.id === filterByUUID);
            data = [doc];
        }

        if (filterIds) {
            for (const filterId of Object.keys(filterIds)) {
                const filter = filterAddons.find((_filter) => {
                    return (_filter.uuid === filterId) || (_filter.tag === filterId);
                });
                if (filter) {
                    if (useStrict === 'true') {
                        await (filter as IPolicyAddonBlock).resetFilters(user);
                    }
                }
            }
        }

        return Object.assign(
            {
                data,
                blocks: filters,
                commonAddons,
            },
            Object.assign(ref.options.uiMetaData, {
                viewHistory: !!history,
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
    private async getDataByAggregationFilters(ref: IPolicySourceBlock, user: PolicyUser, sortState: any, paginationData: any, history? : IPolicyAddonBlock) {
        const filtersAndDataType = await ref.getGlobalSourcesFilters(user);

        const aggregation = [...filtersAndDataType.filters] as unknown[];

        ref.databaseServer.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.BASE
        });

        if (history) {
            const dryRun = ref.databaseServer.getDryRun();

            const { timelineLabelPath, timelineDescriptionPath } = history.options;

            ref.databaseServer.getDocumentAggregationFilters({
                aggregation,
                aggregateMethod: 'push',
                nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.HISTORY,
                timelineLabelPath,
                timelineDescriptionPath,
                dryRun,
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

            ref.databaseServer.getDocumentAggregationFilters({
                aggregation,
                aggregateMethod: 'push',
                nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.SORT,
                sortObject,
            });
        }

        if (paginationData) {
            const { itemsPerPage, page } = paginationData;

            ref.databaseServer.getDocumentAggregationFilters({
                aggregation,
                aggregateMethod: 'push',
                nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.PAGINATION,
                itemsPerPage,
                page
            });
        }

        switch (filtersAndDataType.dataType) {
            case 'vc-documents':
                ref.databaseServer.getDocumentAggregationFilters({
                    aggregation,
                    aggregateMethod: 'unshift',
                    nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.VC_DOCUMENTS,
                    policyId: ref.policyId,
                });

                return await ref.databaseServer.getVcDocumentsByAggregation(aggregation);
            case 'did-documents':
                return await ref.databaseServer.getDidDocumentsByAggregation(aggregation);
            case 'vp-documents':
                ref.databaseServer.getDocumentAggregationFilters({
                    aggregation,
                    aggregateMethod: 'unshift',
                    nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.VP_DOCUMENTS,
                    policyId: ref.policyId,
                });

                const data =  await ref.databaseServer.getVpDocumentsByAggregation(aggregation);
                for (const item of data as any[]) {
                    [item.serials, item.amount, item.error, item.wasTransferNeeded, item.transferSerials, item.transferAmount, item.tokenIds] = await ref.databaseServer.getVPMintInformation(item);
                }
                return data;
            case 'approve':
                ref.databaseServer.getDocumentAggregationFilters({
                    aggregation,
                    aggregateMethod: 'unshift',
                    nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.APPROVE,
                    policyId: ref.policyId,
                });

                return await ref.databaseServer.getApprovalDocumentsByAggregation(aggregation);
            default:
                return [];
        }
    }
}
