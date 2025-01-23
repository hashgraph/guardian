import { ISchemaRuleData, IFormulaRuleData, IConditionRuleData, IRangeRuleData, Schema } from "@guardian/interfaces";
import { TreeListItem } from "../tree-graph/tree-list";
import { FormulaRule, ConditionRule, RangeRule } from "./conditions";
import { SchemaNode, FieldData } from "./schema-node";

export class FieldRule {
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

    public rule?: FormulaRule | ConditionRule | RangeRule;

    public index: number;

    constructor() {
    }

    public get type(): string {
        if (this.rule) {
            return this.rule.type;
        } else {
            return '';
        }
    }

    public getJson(): ISchemaRuleData {
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
            fieldPropertyName: this.fieldPropertyName,
            rule: this.rule?.getJson()
        };
    }

    public static fromData(data: ISchemaRuleData): FieldRule {
        const item = new FieldRule();
        item.id = data.id;
        item.schemaId = data.schemaId;
        item.path = data.path;
        item.schemaName = data.schemaName;
        item.schemaPath = data.schemaPath;
        item.fieldRef = data.fieldRef;
        item.fieldArray = data.fieldArray;
        item.fieldType = data.fieldType;
        item.fieldDescription = data.fieldDescription;
        item.fieldProperty = data.fieldProperty;
        item.fieldPropertyName = data.fieldPropertyName;
        item.rule = this.parsRule(item, data.rule);
        return item;
    }

    public static fromNode(rootNode: SchemaNode, field: TreeListItem<FieldData>): FieldRule {
        const item = new FieldRule();
        const path = field.path.map((e) => e.data.name).join('.');
        const schemaPath = field.path.map((e) => e.data.description).join(' / ');
        item.id = '';
        item.schemaId = rootNode.data.iri;
        item.path = path;
        item.schemaName = rootNode.data.name;
        item.schemaPath = schemaPath;
        item.fieldRef = field.data.isRef;
        item.fieldArray = field.data.isArray;
        item.fieldType = field.data.type;
        item.fieldDescription = field.data.description;
        item.fieldProperty = field.data.property;
        item.fieldPropertyName = field.data.propertyName;
        return item;
    }

    private static parsRule(
        parent: FieldRule,
        rule?: IFormulaRuleData | IConditionRuleData | IRangeRuleData
    ) {
        if (rule) {
            if (rule.type === 'condition') {
                return ConditionRule.fromData(parent, rule);
            } else if (rule.type === 'formula') {
                return FormulaRule.fromData(parent, rule);
            } else if (rule.type === 'range') {
                return RangeRule.fromData(parent, rule);
            }
        }
        return undefined;
    }

    public addRule(rule?: FormulaRule | ConditionRule | RangeRule) {
        this.rule = rule;
        this.rule?.setParent(this);
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

    public clone(): FieldRule {
        return FieldRule.fromData(this.getJson());
    }
}


export class FieldRules {
    private readonly symbol = 'A';
    private startIndex: number = 1;

    public variables: FieldRule[];
    public names: Set<string>;

    constructor() {
        this.variables = [];
        this.names = new Set<string>();
    }

    public get(id: string): FieldRule | undefined {
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

    public getOptions(): any[] {
        const options = [];
        for (const variable of this.variables) {
            options.push({
                label: variable.fieldDescription,
                value: variable.id,
            })
        }
        return options;
    }

    public delete(variable: FieldRule) {
        this.variables = this.variables.filter((v) => v !== variable);
    }

    public fromData(data: ISchemaRuleData[] | undefined) {
        const map = new Map<string, FieldRule>();
        if (data) {
            for (let index = 0; index < data.length; index++) {
                const item = data[index];
                const variable = FieldRule.fromData(item);
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
        const map = new Map<string, FieldRule>();
        if (rootNode) {
            let index = 1000000000;
            for (const root of rootNode) {
                const fields = root.fields.getSelected();
                for (const field of fields) {
                    index++;
                    const variable = FieldRule.fromNode(root, field);
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

    public getMap(): Map<string, Map<string, FieldRule>> {
        const map = new Map<string, Map<string, FieldRule>>();
        for (const variable of this.variables) {
            let m = map.get(variable.schemaId);
            if (!m) {
                m = new Map<string, FieldRule>();
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