import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { BasicBlock } from './basic-block';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Event block decorator
 * @param options
 */
export function EventBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'EventBlock';

            /**
             * Get block data
             * @param args
             */
            async getData(...args) {
                if (typeof super.getData === 'function') {
                    return await super.getData(...args);
                }
                return {};
            }

            /**
             * Set block data
             * @param args
             */
            async setData(...args) {
                if (!this.isActive(args[0])) {
                    throw new BlockActionError('Block not available', this.blockType, this.uuid);
                }
                if (typeof super.getData === 'function') {
                    return await super.setData(...args);
                }
                return {};
            }

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
