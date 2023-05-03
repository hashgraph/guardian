import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { BasicBlock } from './basic-block';
import { IPolicyUser } from '@policy-engine/policy-user';

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
            protected async getSources(user: IPolicyUser, globalFilters: any): Promise<any[]> {
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
