import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces';
import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';

/**
 * External data block decorator
 * @param options
 */
export function ExternalData(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'ExternalData';
        }
    }
}
