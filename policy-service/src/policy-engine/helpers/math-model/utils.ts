import { ComputeEngine } from '@cortex-js/compute-engine';

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
            if (e !== null && e !== undefined) {
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

export function getDocumentValueByPath(doc: any, path: string): any {
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

//Return complete lists instead of a truncated preview
export const EVALUATE_OPTIONS = { materialization: Number.MAX_SAFE_INTEGER };

//Exact results (rationals, radicals) are converted to floating point numbers
export function evaluateNumeric(expression: any): any {
    const result = expression.evaluate(EVALUATE_OPTIONS);
    return result.N(EVALUATE_OPTIONS);
}

function findLibraryDefinition(name: string): any {
    const lib: any = ComputeEngine;
    for (const category of lib.getStandardLibrary()) {
        const definitions = Array.isArray(category.definitions) ? category.definitions : [category.definitions];
        for (const group of definitions) {
            if (group && group[name]) {
                return group[name];
            }
        }
    }
    return null;
}

export function createComputeEngine() {
    const lib: any = ComputeEngine;
    if (!lib.__updated) {
        //Accept Map(collection, function) by reordering the arguments to Map(function, collection)
        const MapDefinition = findLibraryDefinition('Map');
        if (MapDefinition?.canonical) {
            const canonical = MapDefinition.canonical;
            MapDefinition.canonical = function (ops: any[], options: any) {
                if (ops.length >= 2 && ops[0]?.operator !== 'Function' && ops[1]?.operator === 'Function') {
                    ops = [ops[1], ops[0], ...ops.slice(2)];
                }
                return canonical.call(this, ops, options);
            };
        }
        //At returns 0 for an index outside the list range
        const AtDefinition = findLibraryDefinition('At');
        if (AtDefinition?.evaluate) {
            const evaluate = AtDefinition.evaluate;
            AtDefinition.evaluate = function (ops: any[], options: any) {
                const list = ops[0];
                const index = ops[1];
                if (ops.length === 2 && list?.operator === 'List' && index?.isNumberLiteral) {
                    const position = index.re;
                    if (!Number.isInteger(position) || position < 1 || position > list.nops) {
                        return options.engine.number(0);
                    }
                }
                return evaluate.call(this, ops, options);
            };
        }
        lib.__updated = true;
    }
    return new ComputeEngine();
}

export function setValueByPath(
    parent: any,
    fields: any[],
    keys: string[],
    index: number,
    value: any,
): any {
    if (index < keys.length - 1) {
        const key = keys[index];
        const field = fields.find((f) => f.name === key);
        if (!field || !field.isRef) {
            throw Error('Invalid path');
        }
        if (field.isArray) {
            if (!parent[key]) {
                parent[key] = [];
            }
            if (!Array.isArray(parent[key]) || !Array.isArray(value)) {
                throw Error('Invalid path');
            }
            for (let i = 0; i < value.length; i++) {
                if (!parent[key][i]) {
                    parent[key][i] = {};
                }
                setValueByPath(parent[key][i], field.fields, keys, index + 1, value[i]);
            }
        } else {
            if (!parent[key]) {
                parent[key] = {};
            }
            setValueByPath(parent[key], field.fields, keys, index + 1, value);
        }
    } else if (index < keys.length) {
        const key = keys[index];
        parent[key] = value;
    } else {
        return;
    }
}

export function setDocumentValueByPath(
    schema: any,
    doc: any,
    path: string,
    value: any
): any {
    if (!doc || !path) {
        throw Error('Invalid path');
    }
    try {
        const keys = path.split('.');
        const fields = schema.fields;
        setValueByPath(doc, fields, keys, 0, value);
    } catch (error) {
        throw Error('Invalid path');
    }
    return doc;
}

export function findCommand(json: any, command: string): any[] {
    return _findCommand(json, command, null, []);
}

function _findCommand(json: any, command: string, parent: any, result: any[]): any[] {
    if (Array.isArray(json)) {
        if (json[0] === command) {
            result.push(json);
        }
        for (let i = 1; i < json.length; i++) {
            _findCommand(json[i], command, json, result);
        }
    } else if (json === command) {
        if (parent) {
            result.push(parent);
        } else {
            result.push([json]);
        }
    }
    return result;
}

export function parseValue(value: any): any {
    if (value && typeof value === 'object' && 'json' in value) {
        return parseJson(value.json);
    }
    if (value && value.type) {
        if (value.type.kind === 'list') {
            return Array.isArray(value.ops) ? value.ops.map((element: any) => parseValue(element)) : [];
        }
        return value.value;
    }
    return value;
}

function parseJson(json: any): any {
    if (Array.isArray(json)) {
        if (json[0] === 'List') {
            return json.slice(1).map((item) => parseJson(item));
        }
        if (json[0] === 'Rational' && typeof json[1] === 'number' && typeof json[2] === 'number') {
            return json[1] / json[2];
        }
        return json;
    }
    if (json && typeof json === 'object') {
        if (typeof json.num === 'string') {
            return Number(json.num);
        }
        if (typeof json.str === 'string') {
            return json.str;
        }
        return json;
    }
    if (typeof json === 'string') {
        if (json.length >= 2 && json.startsWith('\'') && json.endsWith('\'')) {
            return json.slice(1, -1);
        }
        if (json === 'NaN' || json === 'ComplexInfinity') {
            return NaN;
        }
        if (json === 'PositiveInfinity') {
            return Infinity;
        }
        if (json === 'NegativeInfinity') {
            return -Infinity;
        }
        if (json === 'True') {
            return true;
        }
        if (json === 'False') {
            return false;
        }
    }
    return json;
}
