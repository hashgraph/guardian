import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs';
export class Code {
    text = '';
    context = {};
    constructor(code) {
        this.text = code || '';
    }
    run() {
        const code = `const [user, document, relationships, result, variables, formulas, scope, getField, mathjs, formulajs, table] = arguments;\r\n const __result = (() => { ${this.text} })();\r\n if(__result) { return __result; } else { return result; }`;
        const func = Function(code);
        return func.apply(this.context.document, [
            this.context.user,
            this.context.document,
            this.context.relationships,
            this.context.result,
            this.context.variables,
            this.context.formulas,
            this.context.scope,
            this.context.getField,
            mathjs,
            formulajs,
            this.context.table,
        ]);
    }
    validate() {
        try {
            const code = `const [user, document, relationships, result, variables, formulas, scope, getField, mathjs, formulajs, table] = arguments;\r\n const __result = (() => { ${this.text} })();\r\n if(__result) { return __result; } else { return result; }`;
            Function(code);
            return null;
        }
        catch (error) {
            return String(error);
        }
    }
    setContext(context) {
        this.context = context || {};
    }
    toJson() {
        return {
            code: this.text
        };
    }
    from(json) {
        if (!json || typeof json !== 'object') {
            return this;
        }
        try {
            this.text = json.code || '';
            return this;
        }
        catch (error) {
            return this;
        }
    }
    static from(json) {
        if (!json || typeof json !== 'object') {
            return null;
        }
        try {
            if (json.code) {
                return new Code(json.code);
            }
            else {
                return null;
            }
        }
        catch (error) {
            return null;
        }
    }
}
