import { Schema, SchemaField } from '@guardian/interfaces';
import { IFieldKey } from '../interfaces/field-key.interface.js';

export class XlsxVariable {
    public readonly fieldName: string;
    public readonly fieldDescription: string;
    public readonly fieldPath: string;
    public readonly lvl: number;

    private schema: Schema;
    private field: SchemaField;
    private parent: XlsxVariable;
    private readonly children: XlsxVariable[];

    constructor(
        name: string,
        path: string,
        description: string,
        lvl: number
    ) {
        this.fieldName = name;
        this.fieldPath = path;
        this.fieldDescription = description;
        this.lvl = Math.max(lvl || 0, 0);
        this.children = [];
    }

    public get fullPath(): string {
        if (!this.field) {
            return null;
        }
        if (this.parent) {
            return `${this.parent.fullPath}.${this.field.name}`;
        } else {
            return `${this.field.name}`;
        }
    }

    public add(child: XlsxVariable) {
        this.children.push(child);
        child.parent = this;
    }

    public setSchema(schema: Schema) {
        this.schema = schema;
    }

    public setField(field: SchemaField) {
        this.field = field;
    }

    public update(schemas: Schema[]) {
        if (!this.schema) {
            throw new Error(`${this.fieldPath}: Schema not found.`);
        }
        if (this.lvl) {
            this.field = this.schema.fields.find((f) => f.description === this.fieldDescription);
        } else {
            this.field = this.schema.fields.find((f) => f.title === this.fieldPath);
        }
        if (!this.field) {
            throw new Error(`${this.fieldPath}: Fields not found.`);
        }
        if (this.children.length) {
            const subSchema = schemas.find((s) => s.iri === this.field.type);
            if (!subSchema) {
                throw new Error(`${this.fieldPath}: Type not found.`);
            }
            for (const child of this.children) {
                child.setSchema(subSchema);
                child.update(schemas);
            }
        }
    }
}

export class XlsxExpressions {
    private readonly list: XlsxVariable[];
    private schema: Schema;

    constructor() {
        this.list = [];
    }

    public addVariable(key: IFieldKey, description: string, lvl: number) {
        const variable = new XlsxVariable(key.name, key.path, description, lvl);
        this.list.push(variable);
    }

    public setSchema(schema: Schema) {
        this.schema = schema;
    }

    public updateSchemas(schemas: Schema[]) {
        let last: XlsxVariable;
        const parents = new Map<number, XlsxVariable>();
        const root: XlsxVariable[] = [];
        for (const variable of this.list) {
            if (variable.lvl === 0) {
                root.push(variable);
            } else if (last && variable.lvl - last.lvl < 2) {
                const parent = parents.get(variable.lvl - 1);
                if (parent) {
                    parent.add(variable);
                } else {
                    throw new Error('Parent not found.');
                }
            } else {
                throw new Error(`Invalid group level (${variable.fieldPath}).`);
            }
            last = variable;
            parents.set(variable.lvl, variable);
        }
        for (const variable of root) {
            variable.setSchema(this.schema);
            variable.update(schemas);
        }
    }

    public getVariables(): Map<string, string> {
        const variables = new Map<string, string>();
        for (const row of this.list) {
            variables.set(row.fieldPath, row.fullPath);
        }
        return variables;
    }
}
