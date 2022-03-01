import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { BasicBlock } from './basic-block';
import { BlockActionError } from '@policy-engine/errors';

/**
 * Event block decorator
 * @param options
 */
export function EventBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'EventBlock';

            async getData(...args) {
                if (typeof super.getData === 'function') {
                    return await super.getData(...args);
                }
                return {};
            }

            async setData(...args) {
                if (!this.isActive(args[0])) {
                    throw new BlockActionError('Block not available', this.blockType, this.uuid);
                }
                if (typeof super.getData === 'function') {
                    return await super.setData(...args);
                }
                return {};
            }

        }
    }
}
