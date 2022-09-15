import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';

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
             * Get filters addon
             * @protected
             */
            protected getFiltersAddons(): IPolicyBlock[] {
                const filters: IPolicyBlock[] = [];

                for (const child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        filters.push(child);
                    } else if (child.blockClassName === 'SourceAddon') {
                        for (const filter of child.children) {
                            filters.push(filter);
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

            /**
             * Get global sources
             * @param user
             * @param paginationData
             * @param countResult
             * @protected
             */
            protected async getGlobalSources(user: IPolicyUser, paginationData: any, countResult?: boolean) {
                const dynFilters = {};
                for (const child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        for (const [key, value] of Object.entries(await child.getFilters(user))) {
                            dynFilters[key] = { $eq: value };
                        }
                    }
                }
                return await this.getSources(user, dynFilters, paginationData, countResult);
            }

            /**
             * Get global sources
             * @param user
             * @param paginationData
             * @param countResult
             * @protected
             */
             protected async getGlobalSourcesFilters(user: IPolicyUser) {
                const dynFilters = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        for (const [key, value] of Object.entries(await child.getFilters(user))) {
                            dynFilters.push({ $eq: [value, `\$${key}`] });
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
            protected async getSourcesFilters(user: IPolicyUser, globalFilters: any): Promise<{
                /**
                 * Filters
                 */
                filters: any[],
                /**
                 * Data type
                 */
                dataType: number
            }> {
                const filters = [];
                const sourceAddons = this.children.filter(c => c.blockClassName === 'SourceAddon');
                for (const addon of sourceAddons) {
                    const blockFilter = await addon.getFromSourceFilters(user, globalFilters, true);
                    if (!blockFilter) {
                        continue;
                    }
                    filters.push(blockFilter);
                }
                return {filters, dataType: sourceAddons[0].options.dataType};
            }

            /**
             * Get sources
             * @param user
             * @param globalFilters
             * @param paginationData
             * @param countResult
             * @protected
             */
            protected async getSources(user: IPolicyUser, globalFilters: any, paginationData: any, countResult: boolean = false): Promise<any[] | number> {
                const data = [];
                let totalCount = 0;
                let currentPosition = 0;

                const resultsCountArray = [];
                const sourceAddons = this.children.filter(c => c.blockClassName === 'SourceAddon');

                for (const addon of sourceAddons) {
                    const resultCount = await addon.getFromSource(user, globalFilters, true);
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
                        for (const item of await currentSource.getFromSource(user, globalFilters, false, null)) {
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
                    limit =  paginationData.itemsPerPage - Math.min((previousCount - start), 0);

                    const childData = await currentSource.getFromSource(user, globalFilters, false, {
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
