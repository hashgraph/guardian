import { PolicyBlockDecoratorOptions } from '../../interfaces/index.js';
import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import { IPolicyBlock } from '../../policy-engine.interface.js';
import { IPolicyUser } from '../../policy-user.js';

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
             * Get filters from source
             * @param user Policy user
             * @param globalFilters Global filters
             * @returns Filters
             */
            public getFromSourceFilters(user: IPolicyUser, globalFilters: any): any {
                if (typeof super.getFromSourceFilters === 'function') {
                    return super.getFromSourceFilters(user, globalFilters);
                }
                return null;
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

            /**
             * Get common addons
             * @protected
             */
            protected getSelectiveAttributes(): IPolicyBlock[] {
                return this.children.filter(child => {
                    return child.blockType === 'selectiveAttributes';
                })
            }
        }
    }
}
