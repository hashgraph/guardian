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
                result = result[result.length - 1];
            } else {
                result = result[key];
            }
            if (result === undefined) {
                result = {};
            }
        }
        result[keys[keys.length - 1]] = value;
    }
    return data;
}
