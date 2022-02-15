/**
 * find options in object
 * @constructor
 */

export function findOptions(document: any, field: any) {
    let value: any = null;
    if (document && field) {
        const keys = field.split('.');
        value = document;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            value = value[key];
        }
    }
    return value;
}
