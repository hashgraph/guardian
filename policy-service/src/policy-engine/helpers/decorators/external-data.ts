import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';

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
