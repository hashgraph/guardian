import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs'

export class Code {
    public text: string = '';
    public context: any = {};

    constructor(code?: string) {
        this.text = code || '';
    }

    public run() {
        const code = `const [user, document, relationships, result, variables, formulas, scope, getField, mathjs, formulajs] = arguments;\r\n const __result = (() => { ${this.text} })();\r\n if(__result) { return __result; } else { return result; }`;
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
        ]);
    }

    public validate() {
        try {
            const code = `const [user, document, relationships, result, variables, formulas, scope, getField, mathjs, formulajs] = arguments;\r\n const __result = (() => { ${this.text} })();\r\n if(__result) { return __result; } else { return result; }`;
            Function(code);
            return null;
        } catch (error) {
            return String(error);
        }
    }

    public setContext(context: any) {
        this.context = context || {};
    }

    public toJson() {
        return {
            code: this.text
        };
    }

    public from(json: any): Code | null {
        if (!json || typeof json !== 'object') {
            return this;
        }
        try {
            this.text = json.code || '';
            return this;
        } catch (error) {
            return this;
        }
    }

    public static from(json: any): Code | null {
        if (!json || typeof json !== 'object') {
            return null;
        }
        try {
            if (json.code) {
                return new Code(json.code);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }
}
