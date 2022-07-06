import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { IPolicyEvent } from '@policy-engine/interfaces';
import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';

/**
 * Validator block decorator
 * @param options
 */
export function ValidatorBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'ValidatorBlock';

            public async run(event: IPolicyEvent<any>): Promise<boolean> {
                let result: any;
                if (typeof super.run === 'function') {
                    result = super.run(event);
                }
                return result;
            }
        }
    }
}
