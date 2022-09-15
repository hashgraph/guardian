import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Source addon
 * @param options
 * @constructor
 */
export function SourceAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'SourceAddon';

            /**
             * Get from source
             * @param user
             * @param globalFilters
             * @param countResult
             * @param otherOptions
             */
            public getFromSource(user: IPolicyUser, globalFilters: any, countResult?: boolean, otherOptions?: any): any[] | number {
                if (typeof super.getFromSource === 'function') {
                    return super.getFromSource(user, globalFilters, countResult, otherOptions);
                }
                return (countResult) ? 0 : [];
            }

            /**
             * Get addons
             * @protected
             */
            protected getAddons(): IPolicyBlock[] {
                const filters: IPolicyBlock[] = [];

                for (const child of this.children) {
                    if (child.blockType === 'filtersAddon') {
                        filters.push(child);
                    }
                }

                return filters;
            }

            /**
             * Get filters
             * @param user
             * @protected
             */
            protected async getFilters(user): Promise<{ [key: string]: string }> {
                const filters = {};

                for (const addon of this.getAddons()) {
                    Object.assign(filters, await (addon as any).getFilters(user));
                }

                return filters;
            }
        }
    }
}
