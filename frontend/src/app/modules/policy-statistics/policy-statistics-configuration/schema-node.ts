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
    isArray: boolean;
    isRef: boolean;
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
        if (this.parent) {
            const root = this.getRoot() as SchemaNode;
            const parentFields = root.fields;
            this.fields = parentFields.createView((s) => {
                return s.parent?.data?.type === this.data.iri;
            });
        }
        this.fields.updateSearch();
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

interface IVariableData {
    id: string;
    schemaId: string;
    path: string;
    schemaName: string;
    schemaPath: string;
    fieldType: string;
    fieldRef: boolean;
    fieldArray: boolean;
    fieldDescription: string;
    fieldProperty: string;
    fieldPropertyName: string;
}

export class SchemaVariable implements IVariableData {
    public id: string;
    public schemaId: string;
    public path: string;

    public schemaName: string;
    public schemaPath: string;
    public fieldType: string;
    public fieldRef: boolean;
    public fieldArray: boolean;
    public fieldDescription: string;
    public fieldProperty: string;
    public fieldPropertyName: string;
    public displayType: string;

    public index: number;

    constructor() {
    }

    public updateType(schemas: Map<string | undefined, Schema>) {
        const schema = schemas.get(this.fieldType);
        if (schema) {
            this.displayType = schema.name || this.fieldType;
        } else {
            this.displayType = this.fieldType;
        }
        if (this.fieldArray) {
            this.displayType = `Array(${this.displayType})`;
        }
    }

    public getJson(): IVariableData {
        return {
            id: this.id,
            schemaId: this.schemaId,
            path: this.path,
            schemaName: this.schemaName,
            schemaPath: this.schemaPath,
            fieldType: this.fieldType,
            fieldArray: this.fieldArray,
            fieldRef: this.fieldRef,
            fieldDescription: this.fieldDescription,
            fieldProperty: this.fieldProperty,
            fieldPropertyName: this.fieldPropertyName
        }
    }

    public static fromData(data: IVariableData): SchemaVariable {
        const variable = new SchemaVariable();
        variable.id = data.id;
        variable.schemaId = data.schemaId;
        variable.path = data.path;
        variable.schemaName = data.schemaName;
        variable.schemaPath = data.schemaPath;
        variable.fieldRef = data.fieldRef;
        variable.fieldArray = data.fieldArray;
        variable.fieldType = data.fieldType;
        variable.fieldDescription = data.fieldDescription;
        variable.fieldProperty = data.fieldProperty;
        variable.fieldPropertyName = data.fieldPropertyName;
        return variable;
    }

    public static fromNode(rootNode: SchemaNode, field: TreeListItem<FieldData>): SchemaVariable {
        const variable = new SchemaVariable();
        const path = field.path.map((e) => e.data.name).join('.');
        const schemaPath = field.path.map((e) => e.data.description).join(' / ');
        variable.id = '';
        variable.schemaId = rootNode.data.iri;
        variable.path = path;
        variable.schemaName = rootNode.data.name;
        variable.schemaPath = schemaPath;
        variable.fieldRef = field.data.isRef;
        variable.fieldArray = field.data.isArray;
        variable.fieldType = field.data.type;
        variable.fieldDescription = field.data.description;
        variable.fieldProperty = field.data.property;
        variable.fieldPropertyName = field.data.propertyName;
        return variable;
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

    public getNames(): string[] {
        const names: Set<string> = new Set<string>();
        for (const variable of this.variables) {
            names.add(variable.id);
        }
        return Array.from(names);
    }

    public fromData(data: IVariableData[]) {
        const map = new Map<string, SchemaVariable>();
        if (data) {
            for (let index = 0; index < data.length; index++) {
                const item = data[index];
                const variable = SchemaVariable.fromData(item);
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
                    const variable = SchemaVariable.fromNode(root, field);
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

    public getJson(): any[] {
        return this.variables.map((v) => v.getJson());
    }

    public getMap(): Map<string, Map<string, SchemaVariable>> {
        const map = new Map<string, Map<string, SchemaVariable>>();
        for (const variable of this.variables) {
            let m = map.get(variable.schemaId);
            if (!m) {
                m = new Map<string, SchemaVariable>();
                map.set(variable.schemaId, m);
            }
            m.set(variable.path, variable);
        }
        return map;
    }

    public updateType(schemas: Schema[]) {
        const map = new Map<string | undefined, Schema>();
        for (const schema of schemas) {
            map.set(schema.iri, schema)
        }
        for (const variable of this.variables) {
            variable.updateType(map);
        }
    }
}

interface IFormulaData {
    id: string;
    type: string;
    description: string;
    formula: string;
}

export class SchemaFormula implements IFormulaData {
    public id: string;
    public type: string;
    public description: string;
    public formula: string;
    public index: number;

    constructor() {
        this.type = 'string';
    }

    public getJson(): IFormulaData {
        return {
            id: this.id,
            type: this.type,
            description: this.description,
            formula: this.formula
        }
    }

    public static fromData(data: IFormulaData): SchemaFormula {
        const formula = new SchemaFormula();
        formula.id = data.id;
        formula.type = data.type || 'string';
        formula.description = data.description;
        formula.formula = data.formula;
        return formula;
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

    public setDefault() {
        this.names.clear();
        this.startIndex = 1;
        this.add();
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
    public delete(formula: SchemaFormula) {
        this.formulas = this.formulas.filter((f) => f !== formula);
        if (this.formulas.length === 0) {
            this.setDefault()
        }
    }

    public fromData(data: IFormulaData[]) {
        this.formulas = [];
        if (data) {
            for (let index = 0; index < data.length; index++) {
                const item = data[index];
                const formula = SchemaFormula.fromData(item);
                formula.index = index;
                this.formulas.push(formula);
            }
        }
        for (const item of this.formulas) {
            this.names.add(item.id);
        }
        this.startIndex = this.formulas.length + 1;
        if (this.formulas.length === 0) {
            this.setDefault()
        }
    }

    public getJson(): any[] {
        return this.formulas.map((f) => f.getJson());
    }
}