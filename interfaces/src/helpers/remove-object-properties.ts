/**
 * Remove object properties
 * @param properites Properties to remove
 * @param obj Object
 * @returns Object
 */
export function removeObjectProperties(properites: string[], obj?: any): any {
    if (!obj || !Array.isArray(properites)) {
        return obj;
    }
    if (Array.isArray(obj)) {
        for (const doc of obj) {
            removeObjectProperties(properites, doc);
        }
    }
    for (const fieldValue of Object.values(obj)) {
        if (typeof fieldValue === 'object') {
            removeObjectProperties(properites, fieldValue);
        }
    }
    for (const prop of properites) {
        delete obj[prop];
    }
    return obj;
}
