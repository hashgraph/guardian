/**
 * Set data options
 * @param data Data
 * @param field Field
 * @param value Value
 * @returns Data
 */
export function setOptions(data: any, field: any, value: any) {
    if (data && field) {
        const keys = field.split('.');
        let result = data;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (key === 'L' && Array.isArray(result)) {
                if (result.length > 0) {
                    if (result[result.length - 1] === undefined) {
                        result[result.length - 1] = {};
                    }
                } else {
                    result.push({});
                }
                result = result[result.length - 1];
            } else {
                if (result[key] === undefined) {
                    result[key] = {};
                }
                result = result[key];
            }
        }

        if (Object.prototype.toString.call(result) !== '[object Object]') {
            throw new Error('Can not set property on non object type');
        }

        const lastKey = keys[keys.length - 1];
        result[lastKey] = value;
    }
    return data;
}
