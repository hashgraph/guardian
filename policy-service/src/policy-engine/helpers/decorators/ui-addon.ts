import { PolicyBlockDecoratorOptions } from '../../interfaces/index.js';
import { BasicBlock } from './basic-block.js';

/**
 * Token addon
 * @param options
 * @constructor
 */
export function UIAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            /**
             * Block class name
             */
            public readonly blockClassName = 'UIAddon';
        }
    }
}
