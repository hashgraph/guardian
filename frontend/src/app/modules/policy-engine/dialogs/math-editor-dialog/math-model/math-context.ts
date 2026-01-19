import { MathFormula } from './math-formula';
import { FieldLink } from './field-link';
import { getValueByPath, convertValue, createComputeEngine, getDocumentValueByPath, parseValue } from './utils';
import { MathItemType } from './math-item-type';
import { IContext } from './context.interface';

export class MathContext {
    private readonly list: (MathFormula | FieldLink)[];

    public valid: boolean = false;

    private getField: (path: string) => any;
    private variables: any = {};
    private formulas: any = {};
    private scope: any = {};
    private document: any | null = null;

    constructor(list: (MathFormula | FieldLink)[]) {
        this.list = list;
        this.document = null;
        this.variables = {};
        this.formulas = {};
        this.scope = {};
        this.getField = this.__get.bind({});
    }

    public setDocument(doc: any): IContext {
        this.valid = true;
        try {
            for (const item of this.list) {
                if (item.type === MathItemType.LINK) {
                    item.value = getDocumentValueByPath(doc, item.path);
                }
            }
        } catch (error) {
            this.valid = false;
        }
        this.calculate(doc);
        return {
            variables: this.variables,
            formulas: this.formulas,
            scope: this.scope,
            document: this.document,
            getField: this.getField,
            user: null,
            result: null
        }
    }

    public getContext(): IContext {
        return {
            variables: this.variables,
            formulas: this.formulas,
            scope: this.scope,
            document: this.document,
            getField: this.getField,
            user: null,
            result: null
        }
    }

    public getComponents() {
        const components = [];
        const variableComponents: any[] = [];
        const functionComponents: any[] = [];
        for (const item of this.list) {
            if (item.type === MathItemType.LINK) {
                variableComponents.push({
                    type: MathItemType.LINK,
                    name: item.name,
                    value: `variables[${item.name}]`
                });
            }
            if (item.type === MathItemType.VARIABLE) {
                variableComponents.push({
                    type: MathItemType.VARIABLE,
                    name: item.functionName,
                    value: `variables['${item.functionName}']`
                });
            }
            if (item.type === MathItemType.FUNCTION) {
                const paramsNames = item.functionParams.map((name) => `_ /*${name}*/`).join(',');
                functionComponents.push({
                    type: MathItemType.FUNCTION,
                    name: `${item.functionName}(${item.functionParams.join(',')})`,
                    value: `formulas['${item.functionName}'](${paramsNames})`
                });
            }
        }

        if (variableComponents.length) {
            components.push({
                id: 'variables',
                name: 'Variables',
                components: variableComponents
            });
        }
        if (functionComponents.length) {
            components.push({
                id: 'formulas',
                name: 'Formulas',
                components: functionComponents
            });
        }
        return components;
    }

    private calculate(doc: any) {
        this.document = doc;
        this.variables = {};
        this.formulas = {};
        this.scope = {};
        this.getField = this.__get.bind(doc);
        try {
            const ce = createComputeEngine();
            const systemFunctions = MathFormula.createSystemFunctions();
            for (const systemFunction of systemFunctions) {
                const latex = systemFunction.getLatex();
                if (latex) {
                    ce.assign(systemFunction.functionName, ce.parse(latex));
                    this.formulas[systemFunction.functionName] = this.__evaluate.bind({
                        ce,
                        name: systemFunction.functionName,
                        params: systemFunction.functionParams
                    });
                    this.scope[systemFunction.functionName] = 'Function';
                }
            }
            for (const item of this.list) {
                if (item.type === MathItemType.LINK) {
                    const latex = item.getLatex();
                    if (latex) {
                        ce.assign(item.name, latex);
                    }
                    this.variables[item.name] = item.value;
                    this.scope[item.name] = item.value;
                }
                if (item.type === MathItemType.VARIABLE) {
                    const latex = item.getLatex();
                    if (latex) {
                        const result = ce.parse(latex).evaluate();
                        item.value = parseValue(result);
                        this.variables[item.functionName] = item.value;
                        this.scope[item.functionName] = item.value;
                        if (item.value) {
                            ce.assign(item.functionName, convertValue(item.value));
                        }
                    }
                }
                if (item.type === MathItemType.FUNCTION) {
                    const latex = item.getLatex();
                    if (latex) {
                        ce.assign(item.functionName, ce.parse(latex));
                        this.formulas[item.functionName] = this.__evaluate.bind({
                            ce,
                            name: item.functionName,
                            params: item.functionParams
                        });
                        this.scope[item.functionName] = 'Function';
                    }
                }
            }
        } catch (error) {
            this.valid = false;
            console.log(error);
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
            const __getValue = (value: any): any => {
                if (Array.isArray(value)) {
                    const items = value.map((v) => __getValue(v));
                    return context.ce.box(['List', ...items]);
                } else if (typeof value === 'string') {
                    return context.ce.box(['String', value]);
                } else {
                    return value;
                }
            }
            const __parseValue = (value: any): any => {
                if (value && value.type) {
                    if (value.type.kind === 'list') {
                        const iter = value.each();
                        const result = [];
                        if (iter) {
                            let next = iter.next();
                            while (next && !next.done) {
                                const itemValue = __parseValue(next.value);
                                result.push(itemValue);
                                next = iter.next();
                            }
                            return result;
                        } else {
                            return [];
                        }
                    }
                    return value.value;
                }
                return value;
            }
            for (let i = 0; i < arg.length; i++) {
                const pName = `evaluateFunctionParameter${i}`;
                context.ce.assign(pName, __getValue(arg[i]));
                list[i] = `\\operatorname{${pName}}`;
            }
            const latex = `\\operatorname{${context.name}}(${list.join(',')})`;
            const result = context.ce.parse(latex).evaluate();
            return __parseValue(result);
        } catch (error) {
            console.log(error);
            return NaN;
        }
    }
}
