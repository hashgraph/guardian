import { IAuthUser } from '@auth/auth.interface';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';

/**
 * Datasource block decorator
 * @param options
 */
export function DataSourceBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'DataSourceBlock';

            async getData(...args: any[]): Promise<any> {
                if (typeof super.getData === 'function') {
                    return super.getData(...args);
                }
                return {}
            }

            protected getFiltersAddons(): IPolicyBlock[] {
                const filters: IPolicyBlock[] = [];

                for (let child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        filters.push(child);
                    } else if (child.blockClassName === 'SourceAddon') {
                        for (let filter of child.children) {
                            filters.push(filter);
                        }
                    }
                }

                return filters;
            }

            protected getCommonAddons(): IPolicyBlock[] {
                return this.children.filter(child => {
                    return child.blockClassName === 'SourceAddon';
                })
            }

            protected async getGlobalSources(user: IAuthUser, paginationData: any) {
                const dynFilters = {};
                for (let child of this.children) {
                    if (child.blockClassName === 'DataSourceAddon') {
                        for (let [key, value] of Object.entries(child.getFilters(user))) {
                            dynFilters[key] = { $eq: value };
                        }
                    }
                }
                return await this.getSources(user, dynFilters, paginationData);
            }

            protected async getSources(user: IAuthUser, globalFilters: any, paginationData: any): Promise<any[]> {
                let data = [];
                for (let child of this.children) {
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
