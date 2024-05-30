import { PolicyBlockDecoratorOptions } from '../../interfaces/block-options.js';
import { BasicBlock } from './basic-block.js';
import { PolicyUser } from '../../policy-user.js';

/**
 * Set relationships block decorator
 * @param options
 */
export function SetRelationshipsBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'SetRelationshipsBlock';

            /**
             * Get sources
             * @param user
             * @param globalFilters
             * @protected
             */
            protected async getSources(user: PolicyUser, globalFilters: any): Promise<any[]> {
                const data = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'SourceAddon') {
                        const childData = await child.getFromSource(user, globalFilters);
                        for (const item of childData) {
                            data.push(item);
                        }
                    }
                }
                return data;
            }
        }
    }
}
