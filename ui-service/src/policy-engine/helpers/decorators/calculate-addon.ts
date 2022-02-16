import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import * as mathjs from 'mathjs';

export function CalculateAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'CalculateAddon';

            async run(scope: any): Promise<any> {
                if (typeof super.run === 'function') {
                    return super.run(scope);
                }
                return scope;
            }

            public evaluate(formula: string, scope: any): any {
                return (function (formula: string, scope: any) {
                    try {
                        return this.evaluate(formula, scope);
                    } catch (error) {
                        return 'Incorrect formula';
                    }
                }).call(mathjs, formula, scope);
            }
        }
    }
}
