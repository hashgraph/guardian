import { MathFormula } from './math-formula';
import { FieldLink } from './field-link';
import { getValueByPath, convertValue, createComputeEngine, getDocumentValueByPath, parseValue } from './utils';
import { MathItemType } from './math-item.type';
import { IContext } from './math.interface';
import { DocumentMap } from './document-map';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
    buildTableHelper,
    getTableFormulaNumbers,
    getTableFormulaScalar,
    ITableFormulaColumn,
    resolveTableFormulaColumn
} from '@guardian/interfaces';

type BoxedExpression = ReturnType<ComputeEngine['box']>;

export function getList(expr: any): any[] {
    if (!expr) { return []; }
    if (expr.ops) { return expr.ops; }
    if (expr.each) {
        const result = [];
        const iter = expr.each();
        if (iter) {
            let next = iter.next();
            while (next && !next.done) {
                result.push(next.value);
                next = iter.next();
            }
        }
        return result;
    }
    return [];
}

/**
 * getString coerces numeric values to string via String(expr.value).
 * This means numeric key 5 and string key "5" are treated as equal.
 * All lookup key arrays must use consistent types (all strings or all numbers).
 */
export function getString(expr: any): string | null {
    if (!expr) { return null; }
    if (typeof expr.string === 'string') { return expr.string; }
    if (typeof expr.value === 'string') { return expr.value; }
    if (typeof expr.value === 'number') { return String(expr.value); }
    if (typeof expr.symbol === 'string') { return expr.symbol; }
    return null;
}

export function getNumber(expr: any): number {
    if (!expr) { return 0; }
    if (typeof expr.value === 'number') { return expr.value; }
    return 0;
}

function lookupExtremum(
    ops: ReadonlyArray<BoxedExpression>,
    compare: (a: number, b: number) => boolean,
    seed: number,
    ce: ComputeEngine
): BoxedExpression {
    const vList = getList(ops[0]);
    const kList = getList(ops[1]);
    const sList = getList(ops[3]);

    if (vList.length !== kList.length || kList.length !== sList.length) {
        return ce.number(0);
    }

    const idVal = getString(ops[2]);

    let bestVal: BoxedExpression | null = null;
    let bestSort = seed;

    for (let n = 0; n < kList.length; n++) {
        if (getString(kList[n]) !== idVal) { continue; }
        const s = getNumber(sList[n]);
        if (compare(s, bestSort)) {
            bestSort = s;
            bestVal = vList[n];
        }
    }

    // Returns 0 on no-match (not NaN):
    // NaN * 0 = NaN which would corrupt downstream calculations
    if (bestVal === null) { return ce.number(0); }
    return typeof bestVal.value === 'number' ? ce.number(bestVal.value) : ce.number(0);
}

function boxedScalar(value: unknown, ce: ComputeEngine): BoxedExpression {
    const scalar = getTableFormulaScalar(value);
    return typeof scalar === 'number' ? ce.number(scalar) : ce.string(scalar);
}

function rewriteTableFormula(
    expression: any,
    tableColumns: Map<string, ITableFormulaColumn>,
    getNumericAlias: (name: string) => string
): { expression: any; changed: boolean } {
    if (!Array.isArray(expression)) {
        return { expression, changed: false };
    }
    const operator = expression[0];
    const operands = expression.slice(1).map((operand) =>
        rewriteTableFormula(operand, tableColumns, getNumericAlias)
    );
    if (operator === 'Sum' && expression.length === 2 &&
        typeof expression[1] === 'string' && tableColumns.has(expression[1])) {
        return {
            expression: ['Sum', getNumericAlias(expression[1])],
            changed: true
        };
    }
    if (operator === 'At' &&
        typeof expression[1] === 'string' && tableColumns.has(expression[1])) {
        return {
            expression: [
                'At',
                getNumericAlias(expression[1]),
                ...operands.slice(1).map((operand) => operand.expression)
            ],
            changed: true
        };
    }
    if (operator === 'Lookup' && [expression[1], expression[2]].some((operand) =>
        typeof operand === 'string' && tableColumns.has(operand)
    )) {
        return {
            expression: [
                'TableFormulaLookup',
                ...operands.map((operand) => operand.expression)
            ],
            changed: true
        };
    }
    if (operands.some((operand) => operand.changed)) {
        return {
            expression: [operator, ...operands.map((operand) => operand.expression)],
            changed: true
        };
    }
    return { expression, changed: false };
}

export function registerCEFunctions(
    ce: ComputeEngine,
    tableColumns: Map<string, ITableFormulaColumn> = new Map()
): void {
    const directTableName = (expression: BoxedExpression): string | null => {
        const name = expression?.symbol;
        return typeof name === 'string' && tableColumns.has(name) ? name : null;
    };
    const tableList = (name: string): BoxedExpression => {
        const values = tableColumns.get(name)?.values || [];
        return ce.box(['List', ...values.map((value) => boxedScalar(value, ce))]);
    };
    ce.declare('Lookup', {
        signature: '(value: list, keys: list, id: any) -> number',
        evaluate: (ops: ReadonlyArray<any>) => {
            const values = ops[0];
            const keys = ops[1];
            const id = ops[2];

            const vList = getList(values);
            const kList = getList(keys);
            if (vList.length !== kList.length) { return ce.number(0); }

            const idVal = getString(id);

            for (let n = 0; n < kList.length; n++) {
                const k = getString(kList[n]);
                if (k === idVal) {
                    const v = vList[n];
                    return ce.number(typeof v?.value === 'number' ? v.value : 0);
                }
            }

            // Returns 0 on no-match (not NaN):
            // NaN * 0 = NaN which would corrupt downstream calculations
            return ce.number(0);
        }
    });

    if (tableColumns.size > 0) {
        ce.declare('TableFormulaLookup', {
            signature: '(value: any, keys: any, id: any) -> unknown',
            lazy: true,
            evaluate: (ops: ReadonlyArray<BoxedExpression>) => {
                const valueName = directTableName(ops[0]);
                const keyName = directTableName(ops[1]);
                const values = valueName ? tableList(valueName) : ops[0].evaluate();
                const keys = keyName ? tableList(keyName) : ops[1].evaluate();
                const id = ops[2].evaluate();
                const valueList = getList(values);
                const keyList = getList(keys);
                if (valueList.length !== keyList.length) { return ce.number(0); }
                const idValue = getString(id);
                for (let n = 0; n < keyList.length; n++) {
                    if (getString(keyList[n]) === idValue) {
                        if (valueName) {
                            return boxedScalar(tableColumns.get(valueName)?.values[n], ce);
                        }
                        const value = valueList[n];
                        return ce.number(typeof value?.value === 'number' ? value.value : 0);
                    }
                }
                return ce.number(0);
            }
        });
    }

    ce.declare('LookupTwo', {
        signature: '(value: list, keys1: list, id1: any, keys2: list, id2: any) -> number',
        evaluate: (ops: ReadonlyArray<any>) => {
            const values = ops[0];
            const keys1  = ops[1];
            const id1    = ops[2];
            const keys2  = ops[3];
            const id2    = ops[4];

            const vList  = getList(values);
            const k1List = getList(keys1);
            const k2List = getList(keys2);

            if (vList.length !== k1List.length || k1List.length !== k2List.length) {
                return ce.number(0);
            }

            const id1Val = getString(id1);
            const id2Val = getString(id2);

            for (let n = 0; n < k1List.length; n++) {
                if (getString(k1List[n]) !== id1Val) { continue; }
                if (getString(k2List[n]) !== id2Val) { continue; }
                const v = vList[n];
                return ce.number(typeof v?.value === 'number' ? v.value : 0);
            }

            // Returns 0 on no-match (not NaN):
            // NaN * 0 = NaN which would corrupt downstream calculations
            return ce.number(0);
        }
    });

    ce.declare('LookupMin', {
        signature: '(value: list, keys: list, id: any, sortKeys: list) -> number',
        evaluate: (ops) => lookupExtremum(ops, (a, b) => a < b, Infinity, ce)
    });

    ce.declare('LookupMax', {
        signature: '(value: list, keys: list, id: any, sortKeys: list) -> number',
        evaluate: (ops) => lookupExtremum(ops, (a, b) => a > b, -Infinity, ce)
    });

    ce.declare('EqualString', {
        signature: '(a: any, b: any) -> number',
        evaluate: (ops) => {
            return ce.number(getString(ops[0]) === getString(ops[1]) ? 1 : 0);
        }
    });
}

export class MathContext {
    private readonly list: (MathFormula | FieldLink)[];

    public valid: boolean = false;

    private getField: (path: string) => any;
    private table: any;
    private variables: any = {};
    private formulas: any = {};
    private scope: any = {};
    private document: any | null = null;
    private relationships: any[] = [];
    private readonly tableColumns: Map<string, ITableFormulaColumn> = new Map();
    private readonly tableColumnSources: Map<string, string> = new Map();
    private readonly numericTableAliases: Map<string, string> = new Map();
    private readonly tableWarnings: Map<string, string> = new Map();

    constructor(list: (MathFormula | FieldLink)[]) {
        this.list = list;
        this.document = null;
        this.variables = {};
        this.formulas = {};
        this.scope = {};
        this.getField = this.__get.bind({});
        this.table = buildTableHelper();
    }

    public setDocument(documents: DocumentMap): IContext {
        this.valid = true;
        this.tableColumns.clear();
        this.tableColumnSources.clear();
        try {
            for (const item of this.list) {
                if (item.type === MathItemType.LINK) {
                    const document = documents.getDocument(item.schema);
                    const keys = item.path.split('.');
                    let column: ITableFormulaColumn | null = null;
                    for (let index = 1; index < keys.length; index++) {
                        const tableValue = getDocumentValueByPath(document, keys.slice(0, index).join('.'));
                        const columnKey = keys.slice(index).join('.');
                        column = resolveTableFormulaColumn(tableValue, columnKey);
                        if (column) {
                            this.tableColumns.set(item.name, column);
                            this.tableColumnSources.set(item.name, `${item.schema || ''}\u0000${item.path}`);
                            item.value = column.values;
                            break;
                        }
                    }
                    if (!column) {
                        item.value = getDocumentValueByPath(document, item.path);
                    }
                }
            }
        } catch (error) {
            this.valid = false;
            throw error;
        }
        this.document = documents.getCurrent();
        this.relationships = documents.getRelationships();
        this.calculate(this.document);
        return {
            variables: this.variables,
            formulas: this.formulas,
            scope: this.scope,
            document: this.document,
            relationships: this.relationships,
            getField: this.getField,
            table: this.table,
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
            relationships: this.relationships,
            getField: this.getField,
            table: this.table,
            user: null,
            result: null
        }
    }

    public getWarnings(): string[] {
        return Array.from(this.tableWarnings.values());
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
        this.numericTableAliases.clear();
        this.tableWarnings.clear();
        try {
            const ce = createComputeEngine();

            registerCEFunctions(ce, this.tableColumns);
            const getNumericAlias = (name: string): string => {
                const cached = this.numericTableAliases.get(name);
                if (cached) { return cached; }
                const alias = `__table_formula_numeric_${this.numericTableAliases.size}`;
                const column = this.tableColumns.get(name);
                const converted = getTableFormulaNumbers(column?.values || []);
                this.numericTableAliases.set(name, alias);
                ce.assign(alias, ce.box(['List', ...converted.values] as any));
                if (column && converted.replacements > 0) {
                    const key = this.tableColumnSources.get(name) || `${column.key}\u0000${column.name}`;
                    this.tableWarnings.set(
                        key,
                        `Table column "${column.name}" replaced ${converted.replacements} nonnumeric cells with 0.`
                    );
                }
                return alias;
            };
            const parseFormula = (latex: string): BoxedExpression => {
                const parsed = ce.parse(latex);
                const rewritten = rewriteTableFormula(
                    parsed.json,
                    this.tableColumns,
                    getNumericAlias
                );
                return rewritten.changed ? ce.box(rewritten.expression as any) : parsed;
            };

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
                    const value = item.value;
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                        const ceList = ['List', ...value.map((s: string) => `'${s}'`)];
                        ce.assign(item.name, ce.box(ceList as any)); // CE types don't accept string[] directly
                    } else if (typeof value === 'number') {
                        ce.assign(item.name, ce.number(value));
                    } else if (value !== null && value !== undefined && !Array.isArray(value)) {
                        if (typeof value === 'string') {
                            ce.assign(item.name, ce.string(value));
                        } else {
                            const num = Number(value);
                            if (!isNaN(num)) {
                                ce.assign(item.name, ce.number(num));
                            }
                        }
                    } else {
                        const latex = item.getLatex();
                        if (latex) {
                            if (typeof latex === 'string') {
                                ce.assign(item.name, ce.parse(latex));
                            } else if (Array.isArray(latex)) {
                                ce.assign(item.name, ce.box(latex as any));
                            }
                        }
                    }
                    this.variables[item.name] = item.value;
                    this.scope[item.name] = item.value;
                }
                if (item.type === MathItemType.VARIABLE) {
                    const latex = item.getLatex();
                    if (latex) {
                        const result = parseFormula(latex).evaluate();
                        item.value = parseValue(result);
                        this.variables[item.functionName] = item.value;
                        this.scope[item.functionName] = item.value;
                        if (item.value !== null && item.value !== undefined) {
                            const converted = convertValue(item.value);
                            if (typeof converted === 'number') {
                                ce.assign(item.functionName, ce.number(converted));
                            } else if (Array.isArray(converted)) {
                                ce.assign(item.functionName, ce.box(converted as any));
                            }
                        }
                    }
                }
                if (item.type === MathItemType.FUNCTION) {
                    const latex = item.getLatex();
                    if (latex) {
                        ce.assign(item.functionName, parseFormula(latex));
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
                        const values = [];
                        if (iter) {
                            let next = iter.next();
                            while (next && !next.done) {
                                const itemValue = __parseValue(next.value);
                                values.push(itemValue);
                                next = iter.next();
                            }
                            return values;
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
