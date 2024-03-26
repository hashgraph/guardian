import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import { PolicyBlockDecoratorOptions } from '../../interfaces/block-options.js';
import { IPolicyTokenAddon } from '../../policy-engine.interface.js';

/**
 * Token block decorator
 * @param options
 */
export function TokenBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            /**
             * Block class name
             */
            public readonly blockClassName = 'TokenBlock';

            /**
             * Get block addons
             * @protected
             */
            protected getAddons(): IPolicyTokenAddon[] {
                const addons: IPolicyTokenAddon[] = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'TokenAddon') {
                        addons.push(child);
                    }
                }
                return addons;
            }
        }
    }
}
