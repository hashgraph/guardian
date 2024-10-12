import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import { IPolicyEvent } from '../../interfaces/index.js';
import { PolicyBlockDecoratorOptions } from '../../interfaces/block-options.js';

/**
 * Validator block decorator
 * @param options
 */
export function ValidatorBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'ValidatorBlock';

            /**
             * Run block logic
             * @param event
             */
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
