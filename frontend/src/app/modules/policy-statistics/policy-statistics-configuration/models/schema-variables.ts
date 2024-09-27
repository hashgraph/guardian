import { IVariableData, Schema } from "@guardian/interfaces";
import { FieldData, SchemaNode } from "./schema-node";
import { TreeListItem } from "../../tree-graph/tree-list";

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
    private readonly symbol = 'A';
    private startIndex: number = 1;

    public variables: SchemaVariable[];
    public names: Set<string>;

    constructor() {
        this.variables = [];
        this.names = new Set<string>();
    }

    public get(id: string): SchemaVariable | undefined {
        return this.variables.find((v) => v.id === id);
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

    public fromData(data: IVariableData[] | undefined) {
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
            map.set(schema.iri, schema);
        }
        for (const variable of this.variables) {
            variable.updateType(map);
        }
    }
}
