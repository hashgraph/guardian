import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import { PolicyBlockDecoratorOptions } from '../../interfaces/block-options.js';
import { IPolicyCalculateAddon } from '../../policy-engine.interface.js';

/**
 * Calculate block decorator
 * @param options
 */
export function CalculateBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            /**
             * Block class name
             */
            public readonly blockClassName = 'CalculateBlock';

            /**
             * Get block addons
             * @protected
             */
            protected getAddons(): IPolicyCalculateAddon[] {
                const addons: IPolicyCalculateAddon[] = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'CalculateAddon') {
                        addons.push(child);
                    }
                }
                return addons;
            }
        }
    }
}
