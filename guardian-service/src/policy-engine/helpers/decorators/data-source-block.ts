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
                    if (child.blockClassName === 'SourceAddon') {
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

            protected async getSources(...args): Promise<any[]> {
                let data = [];
                for (let child of this.children) {
                    if (child.blockClassName === 'SourceAddon') {
                        data = data.concat(await child.getFromSource(...args))
                    }
                }

                if (args[1]) {
                    const start = args[1].page * args[1].itemsPerPage;
                    const end = start + args[1].itemsPerPage;
                    data = data.slice(start, end);
                }
                return data;
            }
        }
    }
}
