import { ValidateScore } from './score.js';

function isObject(item: any): boolean {
    return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

export class ValidateNamespace {
    public readonly name: string;

    private readonly documents: any[];
    private readonly children: ValidateNamespace[];
    private readonly scores: ValidateScore[];

    constructor(name: string, documents: any[]) {
        this.name = name;
        this.documents = documents;
        this.children = [];
        this.scores = [];
    }

    public createNamespaces(name: string): ValidateNamespace {
        const namespace = new ValidateNamespace(name, this.documents);
        this.children.push(namespace);
        return namespace;
    }

    public createScore(id: string, name: string): any {
        const score = new ValidateScore(id, name);
        this.scores.push(score);
        return score;
    }

    public getNamespace(id?: string): any {
        const namespace: any = {};
        for (const item of this.scores) {
            if (item.id === id) {
                return namespace;
            }
            const values = item.getScore();
            const keys = Object.keys(values);
            for (const key of keys) {
                if (!isObject(namespace[item.name])) {
                    namespace[item.name] = {};
                }
                namespace[item.name][key] = values[key];
            }
        }
        return namespace;
    }

    public getNames(id?: string): string[] {
        const names = new Set<string>();
        for (const item of this.scores) {
            if (item.id === id) {
                return Array.from(names);
            }
            const keys = item.getName();
            for (const key of keys) {
                names.add(`${item.name}.${key}`);
            }
        }
        return Array.from(names);
    }

    public getField(schema: string, path: string): any {
        const fullPath = [...(path || '').split('.')];
        const document = this.documents?.find((doc) => doc.schema === schema);
        if (!document) {
            return undefined;
        }
        return this.getFieldValue(document, fullPath);
    }

    private getFieldValue(document: any, fullPath: string[]): any {
        let value: any = document?.document?.credentialSubject;
        if (Array.isArray(value)) {
            value = value[0];
        }
        for (const key of fullPath) {
            if (value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        return value;
    }
}
