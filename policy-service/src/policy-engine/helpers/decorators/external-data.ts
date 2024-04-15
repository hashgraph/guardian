import { PolicyBlockDecoratorOptions } from '../../interfaces/index.js';
import { BasicBlock } from '../../helpers/decorators/basic-block.js';

/**
 * External data block decorator
 * @param options
 */
export function ExternalData(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'ExternalData';
        }
    }
}
