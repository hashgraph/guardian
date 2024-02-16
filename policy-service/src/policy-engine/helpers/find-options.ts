/**
 * find options in object
 * @constructor
 */

export function findOptions(document: any, field: any) {
    let value: any = null;
    if (document && field) {
        const keys = field.split('.');
        value = document;
        for (const key of keys) {
            if (key === 'L' && Array.isArray(value)) {
                value = value[value.length - 1];
            } else {
                value = value[key];
            }
        }
    }
    return value;
}
