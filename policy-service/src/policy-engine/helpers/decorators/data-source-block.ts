import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import { PolicyBlockDecoratorOptions } from '../../interfaces/block-options.js';
import { IPolicyBlock } from '../../policy-engine.interface.js';
import { PolicyUser } from '../../policy-user.js';
import { BlockActionError } from '../../errors/index.js';
import { PolicyUtils } from '../utils.js';

/**
 * Datasource block decorator
 * @param options
 */
export function DataSourceBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'DataSourceBlock';

            /**
             * Access block addon method map
             */
            private readonly _accessAddonMap = new Map<string, boolean>();

            /**
             * Get block data
             * @param args
             */
            async getData(...args: any[]): Promise<any> {
                if (typeof super.getData === 'function') {
                    return super.getData(...args);
                }
                return {}
            }

            /**
             * On addon event
             * @param args
             * @returns
             */
            async onAddonEvent(...args: any[]): Promise<void> {
                if (typeof super.onAddonEvent !== 'function') {
                    return;
                }

                const user = args[0];
                if (this._accessAddonMap.get(user?.did) === true) {
                    throw new BlockActionError(
                        'Already processing',
                        this.blockType,
                        this.uuid
                    );
                }

                this._accessAddonMap.set(user?.did, true);
                try {
                    await super.onAddonEvent(...args);
                } catch (error) {
                    throw error;
                } finally {
                    this._accessAddonMap.delete(user?.did);
                }
            }

            /**
             * Get filters addon
             * @protected
             */
            protected getFiltersAddons(): IPolicyBlock[] {
                const filters: IPolicyBlock[] = [];

                for (const child of this.children) {
                    if (child.blockType === 'filtersAddon') {
                        filters.push(child);
                    } else if (child.blockClassName === 'SourceAddon') {
                        for (const filter of child.children) {
                            if (filter.blockType === 'filtersAddon') {
                                filters.push(filter);
                            }
                        }
                    }
                }

                return filters;
            }

            /**
             * Get common addons
             * @protected
             */
            protected getCommonAddons(): IPolicyBlock[] {
                return this.children.filter(child => {
                    return child.blockClassName === 'SourceAddon';
                })
            }

            private parseFilterValue(filterValue: any) {
                if (!filterValue) {
                    return { operator: null, value: null };
                } else if (filterValue.$eq) {
                    return { operator: '$eq', value: filterValue.$eq };
                } else if (filterValue.$ne) {
                    return { operator: '$ne', value: filterValue.$ne };
                } else if (filterValue.$in) {
                    return { operator: '$in', value: filterValue.$in };
                } else if (filterValue.$nin) {
                    return { operator: '$nin', value: filterValue.$nin };
                } else if (filterValue.$gt) {
                    return { operator: '$gt', value: filterValue.$gt };
                } else if (filterValue.$gte) {
                    return { operator: '$gte', value: filterValue.$gte };
                } else if (filterValue.$lt) {
                    return { operator: '$lt', value: filterValue.$lt };
                } else if (filterValue.$lte) {
                    return { operator: '$lte', value: filterValue.$lte };
                } else if (filterValue.$regex) {
                    return { operator: '$regex', value: filterValue.$regex };
                } else {
                    return { operator: '$eq', value: filterValue };
                }
            }

            private checkNumberValue(key: string, filterValue: any): any {
                const { operator, value } = this.parseFilterValue(filterValue);
                if (operator) {
                    const filter: any = {};
                    const numberValue = PolicyUtils.parseQueryNumberValue(value);
                    if (numberValue) {
                        const filter1: any = {};
                        const filter2: any = {};
                        filter1[key] = {};
                        filter1[key][operator] = numberValue[0];
                        filter2[key] = {};
                        filter2[key][operator] = numberValue[1];
                        if (operator === '$ne' || operator === '$nin') {
                            filter.$and = [filter1, filter2];
                        } else {
                            filter.$or = [filter1, filter2];
                        }
                    } else {
                        filter[key] = {};
                        filter[key][operator] = value;
                    }
                    return filter;
                } else {
                    return null;
                }
            }

            /**
             * Get global sources
             * @param user
             * @param paginationData
             * @param countResult
             * @param opts
             * @protected
             */
            protected async getGlobalSources(user: PolicyUser, paginationData: any, countResult?: boolean, opts?: { savepointIds?: string[] } ) {
                const dynFilters = {};
                for (const child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        for (const [key, filterValue] of Object.entries(await child.getFilters(user))) {
                            const { operator, value } = this.parseFilterValue(filterValue);
                            if (operator) {
                                dynFilters[key] = {};
                                dynFilters[key][operator] = value;
                            }

                        }
                    }
                }
                return await this.getSources(user, dynFilters, paginationData, countResult, opts);
            }

            /**
             * Get global sources
             * @param user
             * @param paginationData
             * @param countResult
             * @protected
             */
            protected async getGlobalSourcesFilters(user: PolicyUser) {
                const dynFilters = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        for (const [key, value] of Object.entries(await child.getFilters(user))) {
                            dynFilters.push(PolicyUtils.getQueryFilter(key, value));
                        }
                    }
                }
                return await this.getSourcesFilters(user, dynFilters);
            }

            /**
             * Get sources filters
             * @param user
             * @param globalFilters
             * @returns Sources filters
             */
            protected async getSourcesFilters(user: PolicyUser, globalFilters: any): Promise<{
                /**
                 * Filters
                 */
                filters: any[],
                /**
                 * Data type
                 */
                dataType: number
            }> {
                const sourceAddons = this.children.filter(c => c.blockClassName === 'SourceAddon');
                const filters = [];
                filters.push({
                    $set: {
                        firstVerifiableCredential: {
                            $ifNull: [
                                {
                                    $arrayElemAt: ['$document.verifiableCredential', 0]
                                },
                                null
                            ]
                        }
                    }
                });
                filters.push({
                    $set: {
                        firstCredentialSubject: {
                            $ifNull: [
                                {
                                    $arrayElemAt: ['$document.credentialSubject', 0]
                                },
                                {
                                    $ifNull: [
                                        {
                                            $arrayElemAt: ['$firstVerifiableCredential.credentialSubject', 0]
                                        },
                                        null
                                    ]
                                }
                            ]
                        }
                    }
                });

                for (const addon of sourceAddons) {
                    const blockFilter = await addon.getFromSourceFilters(user, globalFilters);
                    if (!blockFilter) {
                        continue;
                    }

                    filters.push(blockFilter);
                }
                filters.push({
                    $unset: 'firstCredentialSubject',
                });
                filters.push({
                    $unset: 'firstVerifiableCredential',
                });
                return { filters, dataType: sourceAddons[0].options.dataType };
            }

            /**
             * Get sources
             * @param user
             * @param globalFilters
             * @param paginationData
             * @param countResult
             * @param opts
             * @protected
             */
            protected async getSources(
                user: PolicyUser,
                globalFilters: any,
                paginationData: any,
                countResult: boolean = false,
                opts?: { savepointIds?: string[] }
            ): Promise<any[] | number> {
                const data = [];
                let totalCount = 0;
                let currentPosition = 0;

                const _globalFilters = {} as any;
                for (const key of Object.keys(globalFilters)) {
                    const value = this.checkNumberValue(key, globalFilters[key]);
                    if (value) {
                        if (!_globalFilters.$and) {
                            _globalFilters.$and = [];
                        }
                        _globalFilters.$and.push(value);
                    }
                }

                if (opts?.savepointIds?.length) {
                    const bySavepoint = {
                        $or: [
                            {savepointId: {$in: opts.savepointIds}},
                            {savepointId: {$exists: false}},
                            {savepointId: null},
                        ]
                    };
                    if (!_globalFilters.$and) {
                        _globalFilters.$and = [];
                    }
                    _globalFilters.$and.push(bySavepoint);
                }

                const resultsCountArray = [];
                const sourceAddons = this.children.filter(c => c.blockClassName === 'SourceAddon');

                for (const addon of sourceAddons) {
                    const resultCount = await addon.getFromSource(user, _globalFilters, true);
                    totalCount += resultCount;
                    resultsCountArray.push(resultCount);
                }

                if (countResult) {
                    return totalCount;
                }

                for (let i = 0; i < resultsCountArray.length; i++) {
                    const currentSource = sourceAddons[i];

                    // If pagination block is not set
                    if (!paginationData) {
                        for (const item of await currentSource.getFromSource(user, _globalFilters, false, null)) {
                            (data as any[]).push(item);
                        }
                        continue;
                    }

                    let skip: number;
                    let limit: number;

                    const start = paginationData.page * paginationData.itemsPerPage;
                    const end = start + paginationData.itemsPerPage;

                    const previousCount = resultsCountArray.slice(0, i).reduce((partialSum, a) => partialSum + a, 0);

                    if (end <= previousCount) {
                        continue;
                    }

                    if (currentPosition >= paginationData.itemsPerPage) {
                        break;
                    }

                    skip = Math.max(start - previousCount, 0);
                    limit = paginationData.itemsPerPage - Math.min((previousCount - start), 0);

                    const childData = await currentSource.getFromSource(user, _globalFilters, false, {
                        offset: skip,
                        limit: limit - currentPosition
                    });

                    for (const item of childData) {
                        if (currentPosition >= paginationData.itemsPerPage) {
                            break;
                        }
                        data.push(item);
                        currentPosition++;
                    }
                }
                return data;
            }
        }
    }
}
