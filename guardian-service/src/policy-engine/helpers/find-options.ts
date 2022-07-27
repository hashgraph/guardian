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
            value = value[key];
        }
    }
    return value;
}
