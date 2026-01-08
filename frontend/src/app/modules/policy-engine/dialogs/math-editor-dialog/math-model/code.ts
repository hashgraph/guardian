import { IContext } from './context.interface.js';

export class Code {
    public text: string = '';
    public context: any = {};
    public function: () => any;

    constructor(code?: string) {
        this.text = code || '';
    }

    public build() {
        function compileCode(src: string) {
            src = 'with (sandbox) {' + src + '}';
            const code = new Function('sandbox', src);

            function has(target: any, key: any) {
                return true
            }

            function get(target: any, key: any) {
                if (key === Symbol.unscopables) return undefined;
                return target[key];
            }

            return function (sandbox: any) {
                const sandboxProxy = new Proxy(sandbox, { has, get })
                return code.bind(sandbox)(sandboxProxy)
            }
        }
        const body = `const __result = (() => { ${this.text} })(); if(__result) { return __result; } else { return result; }`;
        const context = {
            ...this.context,
            String: String,
            Boolean: Boolean,
            Number: Number,
            Array: Array,
            Map: Map,
            Set: Set,
            Object: Object,
            Math: Math,
            NaN: NaN
        };
        this.function = compileCode(body).bind(undefined, context);
        return this.function;
    }

    public setContext(context: IContext) {
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
            return new Code(json.code);
        } catch (error) {
            return null;
        }
    }
}
