import { SourceAddon, StateField } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyAddonBlock, IPolicyDocument } from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils, QueryType } from '../helpers/utils.js';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';
import { LocationType } from '@guardian/interfaces';

/**
 * Documents source addon
 */
@SourceAddon({
    blockType: 'documentsSourceAddon',
    actionType: LocationType.LOCAL,
    about: {
        label: 'Source',
        title: `Add 'DocumentsSourceAddon' Addon`,
        post: false,
        get: false,
        children: ChildrenType.Special,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class DocumentsSourceAddon {
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
        ref.options?.filters
            ?.filter((filter) => filter?.field?.startsWith('document.'))
            .forEach((filter) => {
                documentCacheFields.add(filter.field.replace('document.', ''));
            });
    }

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
    public async setData(user: PolicyUser, data: any): Promise<void> {
        const oldState = this.state || {};
        oldState[user.id] = data;
        this.state = oldState;

        const ref = PolicyComponentsUtils.GetBlockRef(this);

        PolicyComponentsUtils.BlockUpdateFn(ref.parent, user);
    }

    /**
     * Get data from source
     * @param user
     * @param globalFilters
     * @param countResult
     * @param otherOptions
     */
    async getFromSource(
        user: PolicyUser,
        globalFilters: any,
        countResult?: boolean,
        otherOptions?: any
    ) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const filters: any = {};
        if (!Array.isArray(ref.options.filters)) {
            throw new BlockActionError('filters option must be an array', ref.blockType, ref.uuid);
        }

        if (ref.options.onlyOwnDocuments) {
            filters.owner = user.did;
        }
        if (ref.options.onlyOwnByGroupDocuments) {
            filters.group = user.group;
        }
        if (ref.options.onlyAssignDocuments) {
            filters.assignedTo = user.did;
        }
        if (ref.options.onlyAssignByGroupDocuments) {
            filters.assignedToGroup = user.group;
        }
        if (ref.options.hidePreviousVersions) {
            filters.edited = { $ne: true };
        }

        if (ref.options.schema) {
            filters.schema = ref.options.schema;
        }

        for (const filter of ref.options.filters) {
            const expr = filters[filter.field] || {};

            const query = PolicyUtils.parseQuery(filter.type, filter.value);
            if (query && query.expression) {
                Object.assign(expr, query.expression)
            } else {
                throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
            }

            filters[filter.field] = expr;
        }

        const dynFilters = {};
        for (const [key, value] of Object.entries(await ref.getFilters(user))) {
            dynFilters[key] = value;
        }

        Object.assign(filters, dynFilters);
        if (globalFilters) {
            Object.assign(filters, globalFilters);
        }

        if (!otherOptions) {
            otherOptions = {};
        }

        const stateData = this.state[user.id];
        if (stateData && stateData.orderDirection) {
            otherOptions.orderBy = {};
            if (stateData.orderField) {
                otherOptions.orderBy[stateData.orderField] = stateData.orderDirection;
            } else {
                otherOptions.orderBy.createDate = stateData.orderDirection;
            }
        } else if (ref.options.orderDirection) {
            otherOptions.orderBy = {};
            if (ref.options.orderField) {
                otherOptions.orderBy[ref.options.orderField] = ref.options.orderDirection;
            } else {
                otherOptions.orderBy.createDate = ref.options.orderDirection;
            }
        }

        let data: IPolicyDocument[] | number;
        switch (ref.options.dataType) {
            case 'vc-documents':
                filters.policyId = ref.policyId;
                data = await ref.databaseServer.getVcDocuments(filters, otherOptions, countResult) as number | IPolicyDocument[];
                break;
            case 'did-documents':
                data = await ref.databaseServer.getDidDocuments(filters, otherOptions, countResult);
                break;
            case 'vp-documents':
                filters.policyId = ref.policyId;
                data = await ref.databaseServer.getVpDocuments(filters, otherOptions, countResult) as number | IPolicyDocument[];
                if (!countResult) {
                    for (const item of data as any[]) {
                        [item.serials, item.amount, item.error, item.wasTransferNeeded, item.transferSerials, item.transferAmount, item.tokenIds] = await ref.databaseServer.getVPMintInformation(item);
                    }
                }
                break;
            case 'standard-registries':
                data = await PolicyUtils.getAllStandardRegistryAccounts(ref, countResult, user.userId);
                break;
            case 'approve':
                filters.policyId = ref.policyId;
                data = await ref.databaseServer.getApprovalDocuments(filters, otherOptions, countResult);
                break;
            case 'source':
                data = (countResult) ? [] : 0;
                break;
            // @deprecated 2022-10-01
            case 'root-authorities':
                data = await PolicyUtils.getAllStandardRegistryAccounts(ref, countResult, user.userId);
                break;
            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        if (!countResult) {
            const selectiveAttributeBlock = ref.getSelectiveAttributes()[0];
            for (const dataItem of data as IPolicyDocument[]) {
                if (selectiveAttributeBlock) {
                    const newOptions: any = {};
                    for (const attribute of selectiveAttributeBlock.options
                        .attributes) {
                        ObjSet(
                            newOptions,
                            attribute.attributePath,
                            ObjGet(dataItem.option, attribute.attributePath)
                        );
                    }
                    dataItem.option = newOptions;
                }
                dataItem.__sourceTag__ = ref.tag;
            }
        }

        return data;
    }

    /**
     * Get filters from source
     * @param user Policy user
     * @param globalFilters Global filters
     * @returns Aggregation filter
     */
    async getFromSourceFilters(user: PolicyUser, globalFilters: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const filters: any = [];
        if (!Array.isArray(ref.options.filters)) {
            throw new BlockActionError('filters option must be an array', ref.blockType, ref.uuid);
        }

        if (ref.options.onlyOwnDocuments) {
            filters.push({ $eq: [user.did, '$owner'] });
        }
        if (ref.options.onlyOwnByGroupDocuments) {
            filters.push({ $eq: [user.group, '$group'] });
        }
        if (ref.options.onlyAssignDocuments) {
            filters.push({ $eq: [user.did, '$assignedTo'] });
        }
        if (ref.options.onlyAssignByGroupDocuments) {
            filters.push({ $eq: [user.group, '$assignedToGroup'] });
        }
        if (ref.options.hidePreviousVersions) {
            filters.push({ $ne: [true, '$assignedToGroup'] });
        }

        if (ref.options.schema) {
            filters.push({ $eq: [ref.options.schema, '$schema'] });
        }

        for (const filter of ref.options.filters) {
            const queryType = filter.type as QueryType;
            const queryValue = PolicyUtils.getQueryValue(queryType, filter.value);
            const queryExpression = PolicyUtils.getQueryExpression(queryType, queryValue);
            if (queryExpression) {
                filters.push(PolicyUtils.getQueryFilter(filter.field, queryExpression));
            } else {
                throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
            }
        }

        for (const [key, value] of Object.entries(await ref.getFilters(user))) {
            filters.push(PolicyUtils.getQueryFilter(key, value));
        }

        if (globalFilters) {
            filters.push(...globalFilters);
        }

        this.prepareFilters(filters);
        const blockFilter: any = {
            $set: {
                id: {
                    $toString: '$_id'
                },
                __sourceTag__: {
                    $cond: {
                        if: {
                            $and: [
                                ...filters,
                                {
                                    $or: [
                                        { $eq: [null, '$__sourceTag__'] },
                                        { $not: '$__sourceTag__' }
                                    ]
                                }
                            ]
                        },
                        then: ref.tag,
                        else: '$__sourceTag__'
                    }
                }
            }
        };

        const selectiveAttibuteBlock = ref.getSelectiveAttributes()[0];
        if (selectiveAttibuteBlock) {
            blockFilter.$set.newOption = {
                $cond: {
                    if: {
                        $and: [
                            ...filters,
                            {
                                $or: [
                                    { $eq: [null, '$newOption'] },
                                    { $not: '$newOption' },
                                ],
                            },
                        ],
                    },
                    then: {},
                    else: '$newOption',
                },
            };
            for (const attribute of selectiveAttibuteBlock.options.attributes) {
                blockFilter.$set.newOption.$cond.then[
                    attribute.attributePath
                ] = `$option.${attribute.attributePath}`;
            }
        }

        return blockFilter;
    }

    /**
     * Prepare arrays filters for aggregation
     * @param filters Filters
     */
    private prepareFilters(filters: any[]) {
        for (const filter of filters) {
            const filterKey = Object.keys(filter)[0];
            if (!filterKey) {
                continue;
            }

            const filterValue = filter[filterKey];
            if (Array.isArray(filterValue)) {
                const fieldName = filterValue[1];
                if (typeof fieldName !== 'string') {
                    continue;
                }

                const fieldPathArray = fieldName.split('.');
                const arrayIndexes = fieldPathArray.filter(item => Number.isInteger(+item));

                if (!arrayIndexes.length) {
                    continue;
                }

                const pathWithoutIndexes = fieldPathArray
                    .filter(item => !arrayIndexes.includes(item))
                    .join('.');
                let newFilter: any = { $arrayElemAt: [pathWithoutIndexes, +arrayIndexes[0]] };
                arrayIndexes.shift();
                for (const arrayIndex of arrayIndexes) {
                    newFilter = { $arrayElemAt: [newFilter, +arrayIndex] };
                }
                filterValue[1] = newFilter;
            }
        }
    }
}
