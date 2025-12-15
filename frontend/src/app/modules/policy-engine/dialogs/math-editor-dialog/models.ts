import { ComputeEngine } from '@cortex-js/compute-engine';
import { GenerateUUIDv4 } from '@guardian/interfaces';

export function convertValue(value: any): any {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        const list: any = ['List'];
        for (const item of value) {
            const e = convertValue(item);
            if (e) {
                list.push(e);
            } else {
                return null;
            }
        }
        return list;
    }
    return null;
}

export function getValueByPath(value: any, keys: string[], index: number): any {
    if (index < keys.length) {
        const key = keys[index];
        const result = value[key];
        if (Array.isArray(result)) {
            const results: any[] = new Array(result.length);
            for (let j = 0; j < result.length; j++) {
                results[j] = getValueByPath(result[j], keys, index + 1);
            }
            return results;
        } else {
            return getValueByPath(result, keys, index + 1);
        }
    } else {
        return value;
    }
}

export class Formula {
    public type: 'function' | 'variable' = 'variable';

    public readonly id: string;

    public functionNameText: string = '';
    public functionBodyText: string = '';

    public functionName: string = '';
    public functionParams: string[] = [];
    public functionUnknowns: string[] = [];
    public functionBody: string = '';
    public validName: boolean = false;
    public validBody: boolean = false;

    public error: string = '';
    public empty: boolean = true;
    public validated: boolean = false;

    public value: any;

    private bodyUnknowns: string[] = [];

    private subscriber: Function | null;

    public get valid(): boolean {
        return this.validName && this.validBody;
    }

    public get invalid(): boolean {
        return !this.valid;
    }

    constructor(name?: string, body?: string) {
        this.id = GenerateUUIDv4();
        this.empty = true;
        const validator = ComputeEngine.getStandardLibrary().find((t) => !!t.At)?.At;
        if (validator) {
            validator.signature = "(value: list|tuple|string, indexes: ...(number | string)) -> unknown";
        }
        this.functionNameText = name || '';
        this.functionBodyText = body || '';
    }

    private _setErrorName() {
        this.type = 'variable';
        this.functionName = '';
        this.functionParams = [];
        this.validName = false;
        this.error = 'Invalid name';
    }

    private _updateName() {
        try {
            const text = this.functionNameText.trim();
            if (!text) {
                this._setErrorName();
                return;
            }

            const items = text.match(/\b\w+\b/g) || [];
            const fName = items[0];
            const fParams = items.slice(1);
            if (!fName) {
                this._setErrorName();
                return;
            }

            if (fParams.length === 0) {
                this.type = 'variable';
                this.functionName = fName;
                this.functionParams = [];
                this.validName = true;
                return;
            }

            if (!(text.includes('(') && text.includes(')'))) {
                this._setErrorName();
                return;
            }

            const latex = text.replace(/(\b\w+\b)/g, '\\operatorname{$1}') + ' := 0';
            const ce = new ComputeEngine();
            const f = ce.parse(latex);
            if (!f.isValid) {
                this._setErrorName();
                return;
            }

            const json = f.json as any;

            if (json.length !== 3 ||
                json[0] !== 'Assign' ||
                json[1] !== fName ||
                !Array.isArray(json[2])) {
                this._setErrorName();
                return;
            }

            if (json[2].length !== (fParams.length + 2) ||
                json[2][0] !== 'Function') {
                this._setErrorName();
                return;
            }

            for (let i = 0; i < fParams.length; i++) {
                if (json[2][i + 2] !== fParams[i]) {
                    this._setErrorName();
                    return;
                }
            }

            this.type = 'function';
            this.functionName = fName;
            this.functionParams = fParams;
            this.validName = true;
        } catch (error) {
            this._setErrorName();
        }
    }

    private _updateBody() {
        try {
            const text = this.functionBodyText.trim();
            if (!text) {
                this.bodyUnknowns = [];
                this.validBody = false;
                this.error = 'Invalid function';
                return;
            }
            if (text.includes('\\placeholder')) {
                this.bodyUnknowns = [];
                this.validBody = false;
                this.error = 'Invalid function';
                return;
            }
            const ce = new ComputeEngine();
            const p = ce.parse(text, { canonical: false });
            this.bodyUnknowns = p.unknowns as string[];
            this.validBody = p.isValid;
            if (this.validBody) {
                this.functionBody = this.functionBodyText;
                this.error = '';
            } else {
                this.error = 'Invalid function';
            }
        } catch (error) {
            this.bodyUnknowns = [];
            this.validBody = false;
            this.error = 'Invalid function';
        }
    }

    public updateName() {
        this.validated = false;
        this.empty = false;
        this._updateName();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public updateBody() {
        this.validated = false;
        this.empty = false;
        this._updateBody();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public update() {
        this.validated = false;
        this.empty = false;
        this._updateName();
        this._updateBody();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public updateUnknowns() {
        const map = new Set<string>();
        if (this.functionParams) {
            for (const param of this.functionParams) {
                map.add(param);
            }
        }
        const list: string[] = [];
        if (this.bodyUnknowns) {
            for (const unknown of this.bodyUnknowns) {
                if (!map.has(unknown)) {
                    list.push(unknown);
                }
            }
        }
        this.functionUnknowns = list;
    }

    public subscribe(f: Function) {
        this.subscriber = f;
    }

    public destroy() {
        this.subscriber = null;
    }

    public validate() {
        this.validated = true;
        this._updateName();
        this._updateBody();
    }

    public getLatex(): string | null {
        if (this.invalid) {
            return null;
        }
        if (this.type === 'variable') {
            return this.__evaluateValue(this.functionBody);
        }
        if (this.type === 'function') {
            return this.__evaluateFunction(this.functionParams, this.functionBody);
        }
        return null;
    }

    private __evaluateValue(body: string): string {
        return `${body}`;
    }

    private __evaluateFunction(params: string[], body: string): string {
        return `(${params.join(',')}) \\mapsto ${body}`;
    }
}

export class Link {
    public readonly type = 'link';

    public readonly id: string;
    public variableNameText: string = '';
    public variableName: string = '';
    public validName: boolean = false;

    public schema: string | null = '';
    public field: string | null = '';

    public value: any;

    public error: string = '';
    public empty: boolean = true;
    public validated: boolean = false;

    private subscriber: Function | null;

    public get name(): string {
        return this.variableName;
    }

    public get valid(): boolean {
        return this.validName;
    }

    public get path(): string {
        return '';
    }

    public get invalid(): boolean {
        return !this.valid;
    }

    constructor() {
        this.id = GenerateUUIDv4();
        this.empty = true;
    }

    private _update() {
        try {
            const text = this.variableNameText.trim();
            if (!text) {
                this.validName = false;
                this.error = 'Invalid name';
                return;
            }

            if ((/^[A-Za-z]\w*$/).test(text)) {
                this.variableName = text;
                this.validName = true;
                this.error = '';
            } else {
                this.validName = false;
                this.error = 'Invalid name';
            }
        } catch (error) {
            this.validName = false;
            this.error = 'Invalid name';
        }
    }

    public update() {
        this.validated = false;
        this.empty = false;
        this._update();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public subscribe(f: Function) {
        this.subscriber = f;
    }

    public destroy() {
        this.subscriber = null;
    }

    public validate() {
        this.validated = true;
        this._update();
    }

    public getLatex(): string | null {
        if (this.invalid) {
            return null;
        }
        return convertValue(this.value);
    }
}

export class Group {
    public items: (Formula | Link)[] = [];
    public formulas: Formula[] = [];
    public variables: Link[] = [];
    public valid: boolean = false;

    private list: (Formula | Link)[] = [];

    public addFormula(name?: string, body?: string) {
        const formula = new Formula(name, body);
        formula.update();
        formula.subscribe(this.onChange.bind(this));
        this.formulas.push(formula);
        this.items.push(formula);
        this.update();
    }

    public addVariable() {
        const variable = new Link();
        variable.subscribe(this.onChange.bind(this));
        this.variables.push(variable);
        this.items.push(variable);
        this.update();
    }

    public deleteFormula(formula: Formula) {
        this.formulas = this.formulas.filter((item) => item !== formula);
        this.items = this.items.filter((item) => item !== formula);
        formula.destroy();
        this.update();
    }

    public deleteVariable(variable: Link) {
        this.variables = this.variables.filter((item) => item !== variable);
        this.items = this.items.filter((item) => item !== variable);
        variable.destroy();
        this.update();
    }

    public update() {
        this.onChange();
    }

    private onChange() {
        this.valid = true;
        this.list = [];

        const variables = this.variables.filter((v) => !v.empty);
        const formulas = this.formulas.filter((f) => !f.empty);

        for (const variable of variables) {
            if (!variable.valid) {
                this.valid = false;
                this.list = [];
                return;
            }
        }

        for (const formula of formulas) {
            if (!formula.valid) {
                this.valid = false;
                this.list = [];
                return;
            }
        }

        // Variables
        const list = new Map<string, Formula | Link>();
        for (const variable of variables) {
            const old = list.get(variable.name);
            if (old) {
                old.validName = false;
                variable.validName = false;
                old.error = `Duplicate name`;
                variable.error = `Duplicate name`;
                this.valid = false;
                this.list = [];
                return;
            }
            list.set(variable.name, variable);
            this.list.push(variable);
        }

        // Formulas
        for (const formula of formulas) {
            const old = list.get(formula.functionName);
            if (old) {
                old.validName = false;
                formula.validName = false;
                old.error = `Duplicate name`;
                formula.error = `Duplicate name`;
                this.valid = false;
                this.list = [];
                return;
            }
        }

        const dependencies = new Map<string, Formula>();
        for (const formula of formulas) {
            formula.updateUnknowns();
            if (this.checkUnknowns(list, formula.functionUnknowns)) {
                list.set(formula.functionName, formula);
                this.list.push(formula);
            } else {
                dependencies.set(formula.functionName, formula);
            }
        }

        let lastSize = 0;
        while (dependencies.size > 0 && dependencies.size !== lastSize) {
            lastSize = dependencies.size;

            const formulas = dependencies.values();
            for (const formula of formulas) {
                if (this.checkUnknowns(list, formula.functionUnknowns)) {
                    list.set(formula.functionName, formula);
                    this.list.push(formula);
                    dependencies.delete(formula.functionName);
                }
            }
        }

        if (dependencies.size > 0) {
            const formulas = dependencies.values();
            for (const formula of formulas) {
                formula.validBody = false;
                for (const unknown of formula.functionUnknowns) {
                    if (!list.has(unknown)) {
                        if (!dependencies.has(unknown)) {
                            formula.error = `Unknown variable: ${unknown}`;
                        } else {
                            formula.error = `Cyclic dependence: ${unknown}`;
                        }
                    }
                }
            }
            this.valid = false;
            this.list = [];
            return;
        }
    }

    private checkUnknowns(list: Map<string, Formula | Link>, unknowns: string[]): boolean {
        if (unknowns.length === 0) {
            return true;
        }
        for (const unknown of unknowns) {
            if (!list.has(unknown)) {
                return false;
            }
        }
        return true;
    }

    public createContext(): Context | null {
        this.update();
        if (this.valid) {
            return new Context(this.list);
        } else {
            return null;
        }
    }

    public validate() {
        for (const item of this.items) {
            if (!item.empty) {
                item.validate();
            }
        }
    }
}

export class Context {
    private readonly list: (Formula | Link)[];

    public variables: any = {};
    public formulas: any = {};
    public valid: boolean = false;
    public getField: (path: string) => any;
    public components: any[] = [];

    private ce: ComputeEngine;

    constructor(list: (Formula | Link)[]) {
        this.list = list;
    }

    public setDocument(doc: any): void {
        this.valid = true;
        try {
            for (const item of this.list) {
                if (item.type === 'link') {
                    item.value = this.getValueByPath(doc, item.path);
                }
            }
        } catch (error) {
            this.valid = false;
        }
        this.update(doc);
    }

    private getValueByPath(doc: any, path: string): any {
        try {
            if (!doc || !path) {
                return null;
            }
            const keys = path.split('.');
            return getValueByPath(doc, keys, 0);
        } catch (error) {
            return null;
        }
    }

    private update(doc: any) {
        this.variables = {};
        this.formulas = {};
        this.getField = this.__get.bind(doc);
        this.components = [];
        try {
            const ce = new ComputeEngine();
            for (const item of this.list) {
                if (item.type === 'link') {
                    const latex = item.getLatex();
                    if (latex) {
                        ce.assign(item.name, latex);
                    }
                    this.variables[item.name] = item.value;
                    this.components.push({
                        type: 'link',
                        name: item.name,
                        value: `variables[${item.name}]`
                    })
                }
                if (item.type === 'variable') {
                    const latex = item.getLatex();
                    if (latex) {
                        const result = ce.parse(latex).evaluate();
                        item.value = result?.value;
                        this.variables[item.functionName] = item.value;
                        if (item.value) {
                            ce.assign(item.functionName, convertValue(item.value));
                        }
                    }
                    this.components.push({
                        type: 'variable',
                        name: item.functionName,
                        value: `variables['${item.functionName}']`
                    })
                }
                if (item.type === 'function') {
                    const latex /**/ = item.getLatex();
                    if (latex) {
                        ce.assign(item.functionName, ce.parse(latex));
                        this.formulas[item.functionName] = this.__evaluate.bind({
                            ce,
                            name: item.functionName,
                            params: item.functionParams
                        })
                    }
                    const paramsNames = item.functionParams.map((name) => `_ /*${name}*/`).join(',');
                    this.components.push({
                        type: 'function',
                        name: item.functionName,
                        value: `formulas['${item.functionName}'](${paramsNames})`
                    })
                }
            }
            this.ce = ce;
        } catch (error) {
            this.valid = false;
        }
    }

    private __get(path: string): any {
        try {
            const doc: any = this;
            if (!doc || !path) {
                return null;
            }
            const keys = path.split('.');
            return getValueByPath(doc, keys, 0);
        } catch (error) {
            return null;
        }
    }

    private __evaluate(...arg: any[]): any {
        try {
            const context: any = this;
            if (context.params.length !== arg.length) {
                return NaN;
            }
            const list = new Array(arg.length);
            for (let i = 0; i < arg.length; i++) {
                const pName = `evaluateFunctionParameter${i}`;
                context.ce.assign(pName, arg[i]);
                list[i] = `\\operatorname{${pName}}`;
            }
            const latex = `\\operatorname{${context.name}}(${list.join(',')})`;
            const result = context.ce.parse(latex).evaluate();
            return result?.value;
        } catch (error) {
            return NaN;
        }
    }
}
