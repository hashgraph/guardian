import { ComputeEngine } from '@cortex-js/compute-engine';
import { Formula } from './formula';
import { FieldLink } from './link';
import { getValueByPath, convertValue } from './models';

export class Context {
    private readonly list: (Formula | FieldLink)[];

    public valid: boolean = false;

    private getField: (path: string) => any;
    private components: any[] = [];
    private variables: any = {};
    private formulas: any = {};
    private scope: any = {};
    private document: any | null = null;

    private ce: ComputeEngine;

    constructor(list: (Formula | FieldLink)[]) {
        this.list = list;
        this.document = null;
        this.variables = {};
        this.formulas = {};
        this.scope = {};
        this.getField = this.__get.bind({});
        this.components = [];
    }

    public setDocument(doc: any) {
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
        return {
            components: this.components,
            variables: this.variables,
            formulas: this.formulas,
            scope: this.scope,
            document: this.document,
            getField: this.getField,
        }
    }

    public getContext() {
        return {
            components: this.components,
            variables: this.variables,
            formulas: this.formulas,
            scope: this.scope,
            document: this.document,
            getField: this.getField,
        }
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
        this.document = doc;
        this.variables = {};
        this.formulas = {};
        this.scope = {};
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
                    this.scope[item.name] = item.value;
                    this.components.push({
                        type: 'link',
                        name: item.name,
                        value: `variables[${item.name}]`
                    });
                }
                if (item.type === 'variable') {
                    const latex = item.getLatex();
                    if (latex) {
                        const result = ce.parse(latex).evaluate();
                        item.value = result?.value;
                        this.variables[item.functionName] = item.value;
                        this.scope[item.functionName] = item.value;
                        if (item.value) {
                            ce.assign(item.functionName, convertValue(item.value));
                        }
                    }
                    this.components.push({
                        type: 'variable',
                        name: item.functionName,
                        value: `variables['${item.functionName}']`
                    });
                }
                if (item.type === 'function') {
                    const latex /**/ = item.getLatex();
                    if (latex) {
                        ce.assign(item.functionName, ce.parse(latex));
                        this.formulas[item.functionName] = this.__evaluate.bind({
                            ce,
                            name: item.functionName,
                            params: item.functionParams
                        });
                        this.scope[item.functionName] = 'Function';
                    }
                    const paramsNames = item.functionParams.map((name) => `_ /*${name}*/`).join(',');
                    this.components.push({
                        type: 'function',
                        name: item.functionName,
                        value: `formulas['${item.functionName}'](${paramsNames})`
                    });
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
