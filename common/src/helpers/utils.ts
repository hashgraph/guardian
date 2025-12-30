import { IVC, IVCDocument, GenerateUUIDv4, ArtifactType } from '@guardian/interfaces';
import { Client } from '@hiero-ledger/sdk';

/**
 * Transaction response callback
 */
let TransactionResponseCallback: Function;

/**
 * Schema fields array
 */
export const SchemaFields = [
    'schema',
    'inputSchema',
    'outputSchema',
    'presetSchema',
    'baseSchema'
];

/**
 * Token fields array
 */
export const TokenFields = [
    'tokenId'
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
 * Find all blocks by type
 * @param obj
 * @param type
 */
export function findAllBlocks(
    obj: { [key: string]: any },
    type: string
): { [key: string]: any } {
    const finder = (blockConfig: any, blockType: string, results: any[]): any[] => {
        if (blockConfig.blockType === blockType) {
            results.push(blockConfig);
        }
        if (blockConfig.hasOwnProperty('children')) {
            for (const child of blockConfig.children) {
                finder(child, blockType, results);
            }
        }
        return results;
    }
    return finder(obj, type, []);
}

/**
 * Find all blocks by type
 * @param obj
 * @param blockType
 */
export function findAllTools(obj: { [key: string]: any }): string[] {
    const tools = findAllBlocks(obj, 'tool');
    return tools.map((tool: any) => tool.hash);
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

        for (const key in o) {
            if (!o.hasOwnProperty(key) || key === 'children') {
                continue;
            }

            const v = o[key];

            if (Array.isArray(v)) {
                for (const item of v) {
                    if (item && typeof item === 'object') {
                        finder(item, name);
                    }
                }
            } else if (v && typeof v === 'object') {
                finder(v, name);
            }
        }
    }

    for (const name of names) {
        finder(obj, name);
    }
}

/**
 * Replace all variables in module
 * @param obj
 * @param variableType
 * @param oldValue
 * @param newValue
 */
export function replaceAllVariables(
    obj: { [key: string]: any },
    variableType: string,
    oldValue: string,
    newValue: string
) {
    const finder = (blockConfig: any, type: string): void => {
        if (
            blockConfig.blockType === 'module' &&
            blockConfig.hasOwnProperty('variables') &&
            Array.isArray(blockConfig.variables)
        ) {
            for (const variable of blockConfig.variables) {
                if (variable.type === type && blockConfig[variable.name] === oldValue) {
                    blockConfig[variable.name] = newValue;
                }
            }
        }
        if (
            blockConfig.blockType === 'tool' &&
            blockConfig.hasOwnProperty('variables') &&
            Array.isArray(blockConfig.variables)
        ) {
            for (const variable of blockConfig.variables) {
                if (variable.type === type && blockConfig[variable.name] === oldValue) {
                    blockConfig[variable.name] = newValue;
                }
            }
        }
        if (blockConfig.hasOwnProperty('children')) {
            for (const child of blockConfig.children) {
                finder(child, type);
            }
        }
    }
    finder(obj, variableType);
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
export function getVCIssuer(vcDocument: IVCDocument): string {
    if (vcDocument && vcDocument.document) {
        if (typeof vcDocument.document.issuer === 'string') {
            return vcDocument.document.issuer;
        } else {
            return vcDocument.document.issuer.id || null;
        }
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
            if (key === 'L' && Array.isArray(value)) {
                value = value[value.length - 1];
            } else {
                value = value[key];
            }
        }
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

/**
 * Set transaction response callback
 * @param fn
 */
export function SetTransactionResponseCallback(fn: Function) {
    if (TransactionResponseCallback) {
        throw new Error('Transaction response callback was set before');
    }
    TransactionResponseCallback = fn;
}

/**
 * Transaction response
 * @param client
 * @private
 */
export function TransactionResponse(client: Client) {
    if (TransactionResponseCallback) {
        TransactionResponseCallback(client);
    }
}

/**
 * Get Artifact Type
 * @param extention Artifact File Extention
 * @returns Artifact Type
 */
export function getArtifactType(extention: string): ArtifactType {
    switch (extention) {
        case 'js':
            return ArtifactType.EXECUTABLE_CODE;
        case 'json':
            return ArtifactType.JSON;
        default:
            return null;
    }
}

/**
 * Get Artifact File Extention
 * @param name Full File Name
 * @returns Extention
 */
export function getArtifactExtention(name: string): string {
    return /[^.]+$/.exec(name).toString();
}

/**
 * Replace Artifacts Properties
 * @param obj Config
 * @param property Property Name
 * @param artifactsMapping Mapping Values
 */
export function replaceArtifactProperties(obj: any, property: any, artifactsMapping: Map<string, string>) {
    if (!artifactsMapping || !artifactsMapping.size) {
        return;
    }
    if (obj.hasOwnProperty('artifacts')) {
        for (const artifactConfig of obj.artifacts) {
            artifactConfig[property] = artifactsMapping.get(artifactConfig[property])
        }
    }
    if (obj.hasOwnProperty('children')) {
        for (const child of obj.children) {
            replaceArtifactProperties(child, property, artifactsMapping);
        }
    }
}

export const generateNumberFromString = (inputString) => {
    const base = 31; // Prime number for better distribution (you can use other primes)
    let hash = 0;

    for (let i = 0; i < inputString.length; i++) {
        const char = inputString.charCodeAt(i);
        hash = (hash * base + char) % Number.MAX_SAFE_INTEGER;
    }

    return hash;
}

export function toArrayBuffer(buffer?: Buffer): ArrayBuffer | undefined {
    if (buffer) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    } else if (buffer === null) {
        return null;
    } else {
        return undefined;
    }
}

export function toBuffer(arrayBuffer?: Buffer | ArrayBuffer): Buffer | undefined {
    if (arrayBuffer) {
        return Buffer.from(arrayBuffer as any);
    } else if (arrayBuffer === null) {
        return null;
    } else {
        return undefined;
    }
}

export function ensurePrefix(text: string, prefixes: string | string[], defaultPrefix: string): string {
    const list = Array.isArray(prefixes) ? prefixes : [prefixes];
    if (list.some(p => text.startsWith(p))) {
        return text;
    }

    return defaultPrefix + text;
}

export function stripPrefix(text: string, prefixes: string | string[]): string {
    const list = Array.isArray(prefixes) ? prefixes : [prefixes];
    for (const p of list) {
        if (text.startsWith(p)) {
            return text.slice(p.length);
        }
    }
    return text
}
