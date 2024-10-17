import * as formulajs from '@formulajs/formulajs'
import { create, all, ImportObject } from 'mathjs';

const mathjs = create(all);

const exclude = new Set(['PI'])
const customFunctions: ImportObject = {};
for (const [name, f] of Object.entries(formulajs)) {
    if (typeof f === 'function' && !exclude.has(name)) {
        customFunctions[name] = function (...args: any) {
            return (f as any).apply(null, args);
        }
    }
}
mathjs.import(customFunctions);
mathjs.import({
    equal: function (a: any, b: any) { return a == b }
}, { override: true })

export abstract class Formula {
    /**
     * Evaluate expressions
     * @param formula
     * @param scope
     */
    public static evaluate(formula: string, scope: any): any {
        const ex = formula.trim().trim().replace(/^=/, '');
        return (function (mathjs: any, _formula: string, _scope: any) {
            try {
                return mathjs.evaluate(_formula, _scope);
            } catch (error) {
                return 'Incorrect formula';
            }
        }).call(null, mathjs, ex, scope);
    }
}