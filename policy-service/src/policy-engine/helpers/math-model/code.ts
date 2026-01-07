import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs'

export class Code {
    public text: string = '';
    public context: any = {};

    constructor(code?: string) {
        this.text = code || '';
    }

    public run() {
        const code =
            `
                const [user, document, mathjs, formulajs] = arguments;\r\n
                const __result = (() => { ${this.text} })();\r\n
                if(__result) { return __result; } else { return document; }
            `;
        const func = Function(code);
        return func.apply(this.context.document, [
            this.context.user,
            this.context.document,
            mathjs,
            formulajs,
        ]);
    }

    public setContext(context: any) {
        this.context = context || {};
    }

    public toJson() {
        return this.text;
    }

    public static from(json: any): Code | null {
        if (!json || typeof json !== 'string') {
            return null;
        }
        try {
            return new Code(json);
        } catch (error) {
            return null;
        }
    }
}
