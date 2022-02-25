import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces/block-options';
import {BasicBlock} from './basic-block';

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
                if (typeof super.getData === 'function') {
                    return await super.setData(...args);
                    // const result = await super.setData(...args);
                    // const [user, data] = args;
                    // this.updateBlock(data, user, '')
                    // return result;
                }
                return {};
            }

        }
    }
}
