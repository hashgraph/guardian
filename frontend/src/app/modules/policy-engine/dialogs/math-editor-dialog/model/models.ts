
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


