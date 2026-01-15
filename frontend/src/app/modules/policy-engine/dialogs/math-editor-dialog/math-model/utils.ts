import { ComputeEngine } from "@cortex-js/compute-engine";

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

export function createComputeEngine() {
    const lib: any = ComputeEngine;
    if (!lib.__updated) {
        const At = lib.getStandardLibrary().find((t: any) => !!t.At)?.At;
        if (At) {
            At.signature = '(value: list|tuple|string, indexes: ...(number | string)) -> unknown';
        }
        const Sum = lib.getStandardLibrary().find((t: any) => !!t.Sum)?.Sum;
        if (Sum) {
            Sum.signature = '(collection|function, ...(tuple<symbol>|tuple<symbol, integer>|tuple<symbol, integer, integer>|tuple<symbol, integer, (...any) -> integer>)) -> number';
            const evaluate = Sum.evaluate;
            Sum.evaluate = function () {
                const e = arguments[0];
                if (e && e[1]) {
                    const op2 = e[1].op2;
                    const op3 = e[1].op3;
                    if (op2 || op3) {
                        let start = op2.value;
                        let end = op3.value;
                        if (!start || start < 1 || isNaN(start) || !isFinite(start)) {
                            start = 1;
                        }
                        if (!end || end < 1 || isNaN(end) || !isFinite(end)) {
                            end = start + 1;
                        }
                        if (!(end > start)) {
                            end = start + 1;
                        }
                        Object.defineProperty(op2, 're', {
                            get: function re() {
                                return start;
                            },
                            configurable: true
                        });
                        Object.defineProperty(op3, 're', {
                            get: function re() {
                                return end;
                            },
                            configurable: true
                        });
                    }
                }
                return evaluate.apply(this, arguments);
            }
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