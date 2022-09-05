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
             * @protected
             */
            protected async getGlobalSources(user: IPolicyUser, paginationData: any) {
                const dynFilters = {};
                for (const child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        for (const [key, value] of Object.entries(await child.getFilters(user))) {
                            dynFilters[key] = { $eq: value };
                        }
                    }
                }
                return await this.getSources(user, dynFilters, paginationData);
            }

            /**
             * Get sources
             * @param user
             * @param globalFilters
             * @param paginationData
             * @protected
             */
            protected async getSources(user: IPolicyUser, globalFilters: any, paginationData: any): Promise<any[]> {
                let data = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'SourceAddon') {
                        const childData = await child.getFromSource(user, globalFilters);
                        for (const item of childData) {
                            data.push(item);
                        }
                    }
                }
                if (paginationData) {
                    const start = paginationData.page * paginationData.itemsPerPage;
                    const end = start + paginationData.itemsPerPage;
                    data = data.slice(start, end);
                }
                return data;
            }
        }
    }
}
