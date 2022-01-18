import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';
import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces/block-options';
import {IPolicyBlock} from '@policy-engine/policy-engine.interface';

/**
 * Datasource block decorator
 * @param options
 */
export function DataSourceBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'DataSourceBlock';

            protected getAddons(): IPolicyBlock[] {
                return this.children.filter(child => {
                    return child.blockClassName === 'DataSourceAddon';
                });
            }

            protected getFilters(): {[key: string]: string} {
                const filters = {};

                for (let addon of this.getAddons()) {
                    Object.assign(filters, (addon as any).getFilters());
                }

                return filters;
            }

            async getData(...args: any[]): Promise<any> {
                if (typeof super.getData === 'function') {
                    return super.getData(...args);
                }
                return {}
            }
        }
    }
}
