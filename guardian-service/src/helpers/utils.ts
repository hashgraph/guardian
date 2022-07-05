import { IVC, IVCDocument, GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Schema fields array
 */
export const SchemaFields = [
    'schema',
    'inputSchema',
    'outputSchema',
    'presetSchema'
];

/**
 * Find all entities
 * @param obj
 * @param names
 */
export function findAllEntities(obj: { [key: string]: any }, names: string[]): string[] {
    const result = [];

    const finder = (o: { [key: string]: any }): void => {
        if (!o) {
            return;
        }

        for (const name of names) {
            if (o.hasOwnProperty(name)) {
                result.push(o[name]);
            }
        }

        if (o.hasOwnProperty('children')) {
            for (const child of o.children) {
                finder(child);
            }
        }
    }
    finder(obj);

    const map = {};
    for (const item of result) {
        map[item] = item;
    }
    return Object.values(map);
}

/**
 * Replace all entities
 * @param obj
 * @param names
 * @param oldValue
 * @param newValue
 */
export function replaceAllEntities(
    obj: { [key: string]: any },
    names: string[],
    oldValue: string,
    newValue: string
): void {
    const finder = (o: { [key: string]: any }, name: string): void => {
        if (o.hasOwnProperty(name) && o[name] === oldValue) {
            o[name] = newValue;
        }
        if (o.hasOwnProperty('children')) {
            for (const child of o.children) {
                finder(child, name);
            }
        }
    }
    for (const name of names) {
        finder(obj, name);
    }
}

/**
 * Regenerate IDs
 * @param block
 */
export function regenerateIds(block: any) {
    block.id = GenerateUUIDv4();
    if (Array.isArray(block.children)) {
        for (const child of block.children) {
            regenerateIds(child);
        }
    }
}

/**
 * Get VC field
 * @param vcDocument
 * @param name
 */
export function getVCField(vcDocument: IVC, name: string): any {
    if (
        vcDocument &&
        vcDocument.credentialSubject &&
        vcDocument.credentialSubject[0]
    ) {
        return vcDocument.credentialSubject[0][name];
    }
    return null;
}

/**
 * Get VC issuer
 * @param vcDocument
 */
export function getVCIssuer(vcDocument: IVCDocument | IVCDocument): string {
    if (vcDocument && vcDocument.document) {
        return vcDocument.document.issuer;
    }
    return null;
}

/**
 * Find options
 * @param document
 * @param field
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
    if (Array.isArray(value)) {
        value = value.join(',');
    }
    return value;
}

/**
 * Replace value recursive
 * @param document
 * @param replaceMap
 */
export function replaceValueRecursive(document: any, replaceMap: Map<string, string>): any {
    let str: string;
    switch (typeof document) {
        case 'string':
            str = document;
            break;

        case 'object':
            str = JSON.stringify(document)
            break;

        default:
            throw new Error('Unknown type')
    }

    for (const [oldVal, newVal] of replaceMap.entries()) {
        str = str.replace(new RegExp(oldVal, 'g'), newVal);
    }
    return JSON.parse(str);
}
