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
    const validator = ComputeEngine.getStandardLibrary().find((t) => !!t.At)?.At;
    if (validator) {
        validator.signature = '(value: list|tuple|string, indexes: ...(number | string)) -> unknown';
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