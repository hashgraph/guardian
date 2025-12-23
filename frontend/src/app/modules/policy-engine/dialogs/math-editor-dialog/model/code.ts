

export class Code {
    public text: string = '';
    public context: any = {};
    public function: () => any;

    constructor() {
        this.text = '';
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
        const body = `const __result = (() => { ${this.text} })(); if(__result) { return __result; } else { return document; }`;
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

    public setContext(context: any) {
        this.context = context || {};
    }
}
