import { IVC, IVCDocument, GenerateUUIDv4 } from '@guardian/interfaces';

export const SchemaFields = [
    'schema',
    'inputSchema',
    'outputSchema',
    'presetSchema'
];

export function findAllEntities(obj: { [key: string]: any }, names: string[]): string[] {
    const result = [];

    function finder(o: { [key: string]: any }): void {
        if (!o) {
            return;
        }

        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (o.hasOwnProperty(name)) {
                result.push(o[name]);
            }
        }

        if (o.hasOwnProperty('children')) {
            for (let child of o['children']) {
                finder(child);
            }
        }
    }
    finder(obj);

    const map = {};
    for (let index = 0; index < result.length; index++) {
        map[result[index]] = result[index];
    }
    return Object.values(map);
}

export function replaceAllEntities(
    obj: { [key: string]: any },
    names: string[],
    oldValue: string,
    newValue: string
): void {
    function finder(o: { [key: string]: any }, name: string): void {
        if (o.hasOwnProperty(name) && o[name] == oldValue) {
            o[name] = newValue;
        }
        if (o.hasOwnProperty('children')) {
            for (let child of o['children']) {
                finder(child, name);
            }
        }
    }
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        finder(obj, name);
    }
}


export function regenerateIds(block: any) {
    block.id = GenerateUUIDv4();
    if (Array.isArray(block.children)) {
        for (let child of block.children) {
            regenerateIds(child);
        }
    }
}

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

export function getVCIssuer(vcDocument: IVCDocument | IVCDocument): string {
    if (vcDocument && vcDocument.document) {
        return vcDocument.document.issuer;
    }
    return null;
}

export function findOptions(document: any, field: any) {
    let value: any = null;
    if (document && field) {
        const keys = field.split('.');
        value = document;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (Array.isArray(value[key])) {
                value = value[key].join(',');
            } else {
                value = value[key];
            }
        }
    }
    return value;
}


export function replaceValueRecursive(document: any, replaceMap: Map<string, string>): any {
    let str: string;
    switch (typeof document) {
        case 'string':
            str = document;
            break;

        case 'object':
            str = JSON.stringify(document)
    }

    for (let [oldVal, newVal] of replaceMap.entries()) {
        str = str.replace(new RegExp(oldVal, 'g'), newVal);
    }
    return JSON.parse(str);
}
