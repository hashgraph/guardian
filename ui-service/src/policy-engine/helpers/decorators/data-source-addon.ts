import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces';
import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';
import {StateContainer} from '@policy-engine/state-container';

export function DataSourceAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            private filters: {[key: string]: string};

            public readonly blockClassName = 'DataSourceAddon';

            public getFilters(): {[key: string]: string} {
                return this.filters;
            }

            protected setFilters(filters): void {
                console.log('setFilters', filters)
                this.filters = filters
            }

            async getData(...args: any[]): Promise<any> {
                if (typeof super.getData === 'function') {
                    return super.getData(...args);
                }
                return {}
            }

            async setData(...args: any[]): Promise<any> {
                let result = {}
                if (typeof super.setData === 'function') {
                    result = super.setData(...args);
                }
                StateContainer.UpdateFn(this.parent.uuid, {}, args[0], this.tag);
                return result;
            }
        }
    }
}
