import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';

/**
 * Calculate block decorator
 * @param options
 */
export function CalculateBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'CalculateBlock';

            protected getAddons(): IPolicyCalculateAddon[] {
                const addons: IPolicyCalculateAddon[] = [];
                for (let child of this.children) {
                    if (child.blockClassName === 'CalculateAddon') {
                        addons.push(child);
                    }
                }
                return addons;
            }
        }
    }
}
