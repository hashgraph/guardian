import { Schema } from "@guardian/interfaces";
import { TreeListView, TreeListData, TreeListItem } from "../tree-graph/tree-list";
import { TreeNode } from "../tree-graph/tree-node";

export interface SchemaData {
    iri: string;
    name: string;
    description: string;
}

export interface FieldData {
    name: string;
    type: string;
    description: string;
    property: string;
    propertyName: string;
}

export class SchemaRules {
    public relationships: 'main' | 'related' | 'unrelated';
    public unique: 'true' | 'false';

    constructor() {
        this.relationships = 'unrelated';
        this.unique = 'false';
    }
}

export class SchemaNode extends TreeNode<SchemaData> {
    public fields: TreeListView<FieldData>;
    public rules: SchemaRules;

    public override clone(): SchemaNode {
        const clone = new SchemaNode(this.id, this.type, this.data);
        clone.type = this.type;
        clone.data = this.data;
        clone.childIds = new Set(this.childIds);
        clone.fields = this.fields;
        clone.rules = this.rules;
        return clone;
    }

    public override update() {
        this.fields = this.getRootFields();
    }

    public getRootFields(): TreeListView<FieldData> {
        if (this.parent) {
            const parentFields = (this.parent as SchemaNode).getRootFields();
            return parentFields.createView((s) => {
                return s.parent?.data?.type === this.data.iri;
            });
        } else {
            return this.fields;
        }
    }

    public static from(schema: Schema, properties: Map<string, string>): SchemaNode {
        const id = schema.iri;
        const type = schema.entity === 'VC' ? 'root' : 'sub';
        const data = {
            iri: schema.iri || '',
            name: schema.name || '',
            description: schema.description || ''
        };
        const result = new SchemaNode(id, type, data);
        const fields = TreeListData.fromObject<FieldData>(schema, 'fields', (f) => {
            if (f.data.property) {
                f.data.propertyName = properties.get(f.data.property) || f.data.property;
            }
            return f;
        });
        result.fields = TreeListView.createView(fields, (s) => {
            return !s.parent;
        });
        result.fields.setSearchRules((item) => {
            return [
                `(${item.description || ''})|(${item.propertyName || ''})`.toLocaleLowerCase(),
                `(${item.description || ''})`.toLocaleLowerCase(),
                `(${item.propertyName || ''})`.toLocaleLowerCase()
            ];
        })
        result.rules = new SchemaRules();
        return result;
    }
}

export class SchemaVariable {
    public id: string;
    public path: string;
    public namePath: string;
    public schemaId: string;
    public schema: string;
    public description: string;
    public property: string;
    public propertyName: string;
    public type: string;
    public index: number;

    constructor() {
    }
}

export class SchemaVariables {
    private readonly symbol = 'A'
    private startIndex: number = 1;

    public variables: SchemaVariable[];
    public names: Set<string>;

    constructor() {
        this.variables = [];
        this.names = new Set<string>();
    }

    public getName(): string {
        let name: string = '';
        for (let index = this.startIndex; index < 1000000; index++) {
            name = `${this.symbol}${index}`;
            if (!this.names.has(name)) {
                this.names.add(name);
                return name;
            }
        }
        return name;
    }

    public fromData(data: any[]) {
        const map = new Map<string, SchemaVariable>();
        if (data) {
            for (let index = 0; index < data.length; index++) {
                const item = data[index];
                const variable = new SchemaVariable();
                variable.id = item.id;
                variable.schemaId = item.schemaId;
                variable.path = item.path;
                variable.namePath = item.namePath;
                variable.schema = item.schema;
                variable.description = item.description;
                variable.type = item.type;
                variable.property = item.property;
                variable.propertyName = item.propertyName;
                variable.index = index;

                const fullPath = `${variable.schemaId}.${variable.path}`;
                map.set(fullPath, variable);
            }
        }

        this.variables = [];
        for (const item of map.values()) {
            this.variables.push(item);
            this.names.add(item.id);
        }
        this.variables.sort((a, b) => a.index > b.index ? 1 : -1);
        for (let index = 0; index < this.variables.length; index++) {
            this.variables[index].index = index;
        }
        this.startIndex = this.variables.length + 1;
    }

    public fromNodes(rootNode: SchemaNode[]) {
        const map = new Map<string, SchemaVariable>();
        if (rootNode) {
            let index = 1000000000;
            for (const root of rootNode) {
                const fields = root.fields.getSelected();
                for (const field of fields) {
                    index++;
                    const variable = new SchemaVariable();
                    const path = field.getPath();
                    variable.id = '';
                    variable.schemaId = root.data.iri;
                    variable.path = path.map((e) => e.data.name).join('.');
                    variable.namePath = path.map((e) => e.data.description).join(' / ');
                    variable.schema = root.data.name;
                    variable.description = field.data.description;
                    variable.type = field.data.type;
                    variable.property = field.data.property;
                    variable.propertyName = field.data.propertyName;
                    variable.index = index;
                    const fullPath = `${variable.schemaId}.${variable.path}`;
                    map.set(fullPath, variable);
                }
            }
        }

        for (const variable of this.variables) {
            const fullPath = `${variable.schemaId}.${variable.path}`;
            if (map.has(fullPath)) {
                map.set(fullPath, variable);
            }
        }

        this.variables = [];
        for (const item of map.values()) {
            if (item.index > 1000000000) {
                item.id = this.getName();
            }
            this.variables.push(item);
            this.names.add(item.id);
        }

        this.variables.sort((a, b) => a.index > b.index ? 1 : -1);
        for (let index = 0; index < this.variables.length; index++) {
            this.variables[index].index = index;
        }
    }
}

export class SchemaFormula {
    public id: string;
    public type: string;
    public description: string;
    public formula: string;
    public index: number;

    constructor() {
    }
}

export class SchemaFormulas {
    private readonly symbol = 'B'
    private startIndex: number = 1;

    public formulas: SchemaFormula[];
    public names: Set<string>;

    constructor() {
        this.formulas = [];
        this.names = new Set<string>();
    }

    public getName(): string {
        let name: string = '';
        for (let index = this.startIndex; index < 1000000; index++) {
            name = `${this.symbol}${index}`;
            if (!this.names.has(name)) {
                this.names.add(name);
                return name;
            }
        }
        return name;
    }

    public add() {
        const formula = new SchemaFormula();
        formula.id = this.getName();
        this.formulas.push(formula);
    }

    public fromData(data: any[]) {
        this.formulas = [];
        if (data) {
            for (let index = 0; index < data.length; index++) {
                const item = data[index];
                const formula = new SchemaFormula();
                formula.id = item.id;
                formula.type = item.type;
                formula.description = item.description;
                formula.formula = item.formula;
                formula.index = index;
                this.formulas.push(formula);
            }
        }
        for (const item of this.formulas) {
            this.names.add(item.id);
        }
        this.startIndex = this.formulas.length + 1;
    }
}