import { Schema, SchemaField } from "@guardian/interfaces";

export class XlsxVariable {
    public readonly name: string;
    public readonly description: string;
    public readonly lvl: number;

    private schema: Schema;
    private field: SchemaField;
    private children: XlsxVariable[];
    private parent: XlsxVariable;

    constructor(
        name: string,
        description: string,
        lvl: number
    ) {
        this.name = name;
        this.description = description;
        this.lvl = Math.max(lvl || 0, 0);
        this.children = [];
    }

    public get path(): string {
        if (!this.field) {
            return null;
        }
        if (this.parent) {
            return `${this.parent.path}.${this.field.name}`;
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
            console.debug('! error 5');
            throw new Error("! error 5"); 
        }
        if (this.lvl) {
            this.field = this.schema.fields.find((f) => f.description === this.description);
        } else {
            this.field = this.schema.fields.find((f) => f.name === this.name);
        }
        if (!this.field) {
            console.debug('! error 4');
            throw new Error("! error 4"); 
        }
        if (this.children.length) {
            const subSchema = schemas.find((s) => s.iri === this.field.type);
            if (!subSchema) {
                console.debug('! error 3');
                throw new Error("! error 3"); 
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

    public addVariable(name: string, description: string, lvl: number) {
        const variable = new XlsxVariable(name, description, lvl);
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
                    console.debug('! error 1');
                }
            } else {
                console.debug('! error 2');
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
            variables.set(row.name, row.path);
        }
        return variables;
    }
}
