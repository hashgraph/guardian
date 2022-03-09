import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces';
import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';
import {IPolicyBlock} from '@policy-engine/policy-engine.interface';

export function SourceAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'SourceAddon';

            protected getAddons(): IPolicyBlock[] {
                const filters: IPolicyBlock[] = [];

                for (let child of this.children) {
                    if (child.blockType === 'filtersAddon') {
                        filters.push(child);
                    }
                }

                return filters;
            }

            protected getFilters(user): {[key: string]: string} {
                const filters = {};

                for (let addon of this.getAddons()) {
                    Object.assign(filters, (addon as any).getFilters(user));
                }

                return filters;
            }

            public getFromSource(...args): any[] {
                if (typeof super.getFromSource === 'function') {
                    return super.getFromSource(...args)
                }
                return [];
            }
        }
    }
}
