import { PolicyBlockDecoratorOptions } from '../../interfaces/index.js';
import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import * as mathjs from 'mathjs';
import { PolicyUser } from '../../policy-user.js';

/**
 * Calculate addon
 * @param options
 * @constructor
 */
export function CalculateAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            /**
             * Block class name
             */
            public readonly blockClassName = 'CalculateAddon';

            /**
             * Run block logic
             * @param scope
             */
            public async run(scope: any, user: PolicyUser): Promise<any> {
                if (typeof super.run === 'function') {
                    return super.run(scope, user);
                }
                return scope;
            }

            /**
             * Evaluate expressions
             * @param formula
             * @param scope
             */
            public evaluate(formula: string, scope: any): any {
                return (function (_formula: string, _scope: any) {
                    try {
                        return this.evaluate(_formula, _scope);
                    } catch (error) {
                        return 'Incorrect formula';
                    }
                }).call(mathjs, formula, scope);
            }

            /**
             * Parse formula
             * @param formula
             */
            public parse(formula: string): boolean {
                return (function (_formula: string) {
                    try {
                        this.parse(_formula);
                        return true;
                    } catch (error) {
                        return false;
                    }
                }).call(mathjs, formula);
            }

            /**
             * Get variables
             * @param variables
             */
            public getVariables(variables: any): any {
                if (typeof super.getVariables === 'function') {
                    return super.getVariables(variables);
                }
                return variables;
            }
        }
    }
}
