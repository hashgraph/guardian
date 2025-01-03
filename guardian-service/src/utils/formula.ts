import { FormulaEngine } from '@guardian/interfaces';
import * as formulajs from '@formulajs/formulajs'
import { create, all, ImportObject } from 'mathjs';

export function initMathjs() {
    FormulaEngine.setMathEngine((() => {
        const mathjs = create(all);
        const exclude = new Set(['PI'])
        const customFunctions: ImportObject = {};
        for (const [name, f] of Object.entries(formulajs)) {
            if (typeof f === 'function' && !exclude.has(name)) {
                // tslint:disable-next-line:only-arrow-functions
                customFunctions[name] = function (...args: any) {
                    return (f as any).apply(null, args);
                }
            }
        }
        mathjs.import(customFunctions);
        mathjs.import({
            // tslint:disable-next-line:only-arrow-functions object-literal-shorthand triple-equals
            equal: function (a: any, b: any) { return a == b }
        }, { override: true })
        return mathjs;
    })())
}