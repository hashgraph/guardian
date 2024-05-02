/**
 * Find all field values in object by field name
 * @param obj
 * @param name
 */
export function findAllEntities(obj: { [key: string]: any }, name: string): string[] {
    const result = [];

    const finder = (o: { [key: string]: any }): void => {
        if (!o) {
            return;
        }
        if (o.hasOwnProperty(name)) {
            result.push(o[name]);
        }

        if (o.hasOwnProperty('children')) {
            for (const child of o.children) {
                finder(child);
            }
        }
    }
    finder(obj);

    const map = {};
    for (const r of result) {
        map[r] = r;
    }
    return Object.values(map);
}

/**
 * Replace all field values by field name
 * @param obj
 * @param name
 * @param oldValue
 * @param newValue
 */
export function replaceAllEntities(
    obj: { [key: string]: any },
    name: string,
    oldValue: string,
    newValue: string
): void {
    const finder = (o: { [key: string]: any }): void => {
        if (o.hasOwnProperty(name) && o[name] === oldValue) {
            o[name] = newValue;
        }

        if (o.hasOwnProperty('children')) {
            for (const child of o.children) {
                finder(child);
            }
        }
    }
    finder(obj);
}

/**
 * Pars int
 * @param value
 */
export function parseInteger(value: any): number | undefined {
    if (typeof value === 'string') {
        const result = Number.parseInt(value, 10);
        if (Number.isFinite(result)) {
            return result;
        } else {
            return undefined;
        }
    }
    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            return Math.floor(value);
        } else {
            return undefined;
        }
    }
    return undefined;
}