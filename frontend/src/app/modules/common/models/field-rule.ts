import {
    IConditionElseData,
    IConditionEnum,
    IConditionFormula,
    IConditionIfData,
    IConditionRange,
    IConditionRuleData,
    IConditionText,
    IFormulaRuleData,
    IRangeRuleData,
    ISchemaRuleData,
    Schema
} from "@guardian/interfaces";
import { FieldData, SchemaNode } from "./schema-node";
import { TreeListItem } from "../tree-graph/tree-list";

export class ConditionValue {
    public type: 'formula' | 'range' | 'text' | 'enum';
    public formula: string;
    public min: string | number;
    public max: string | number;
    public text: string;
    public enum: string[];

    private _parentType: 'if' | 'then';
    private _parent: ConditionIf | ConditionElse;
    private _variable: string;

    public get variable(): string {
        if (this._parentType === 'then') {
            return this._parent?.variable;
        } else {
            return this._variable;
        }
    }

    public set variable(value: string) {
        this._variable = value;
    }

    constructor(
        parentType: 'if' | 'then',
        parent: ConditionIf | ConditionElse
    ) {
        this._parentType = parentType;
        this.type = 'formula';
        this._parent = parent;
        this._parent = parent;
    }

    public getJson(): (IConditionFormula | IConditionRange | IConditionText | IConditionEnum) {
        if (this.type === 'formula') {
            return {
                type: this.type,
                formula: this.formula,
            }
        } else if (this.type === 'range') {
            return {
                type: this.type,
                variable: this.variable,
                min: this.min,
                max: this.max,
            }
        } else if (this.type === 'text') {
            return {
                type: this.type,
                variable: this.variable,
                value: this.text,
            }
        } else if (this.type === 'enum') {
            return {
                type: this.type,
                variable: this.variable,
                value: this.enum,
            }
        } else {
            return {
                type: 'formula',
                formula: '',
            }
        }
    }

    public static fromData(
        parentType: 'if' | 'then',
        parent: ConditionIf | ConditionElse,
        data?: (IConditionFormula | IConditionRange | IConditionText | IConditionEnum)
    ): ConditionValue {
        const item = new ConditionValue(parentType, parent);
        if (data) {
            item.type = data.type;
            if (data.type === 'formula') {
                item.formula = data.formula;
                return item;
            } else if (data.type === 'range') {
                item.variable = data.variable;
                item.min = data.min;
                item.max = data.max;
                return item;
            } else if (data.type === 'text') {
                item.variable = data.variable;
                item.text = data.value;
                return item;
            } else if (data.type === 'enum') {
                item.variable = data.variable;
                item.enum = data.value;
                return item;
            }
        }
        return item;
    }
}

export class ConditionIf {
    public readonly type = 'if';
    public condition: ConditionValue;
    public formula: ConditionValue;

    private _parent: ConditionRule;

    constructor(parent: ConditionRule) {
        this._parent = parent;
        this.condition = new ConditionValue('if', this);
        this.formula = new ConditionValue('then', this);
    }

    public get variable(): string {
        return this._parent?.variable;
    }

    public getJson(): IConditionIfData {
        return {
            type: this.type,
            condition: this.condition.getJson(),
            formula: this.formula.getJson(),
        }
    }

    public static fromData(parent: ConditionRule, data: IConditionIfData): ConditionIf {
        const item = new ConditionIf(parent);
        item.condition = ConditionValue.fromData('if', item, data.condition);
        item.formula = ConditionValue.fromData('then', item, data.formula);
        return item;
    }

    public static fromConditions(
        parent: ConditionRule,
        data?: (IConditionIfData | IConditionElseData)[]
    ): ConditionIf[] {
        let result: ConditionIf[];
        if (Array.isArray(data)) {
            const list = data.filter((e) => e.type === 'if');
            result = list.map((e) => ConditionIf.fromData(parent, e as IConditionIfData));
        } else {
            result = [];
        }
        if (result.length === 0) {
            result.push(new ConditionIf(parent));
        }
        return result;
    }
}

export class ConditionElse {
    public readonly type = 'else';
    public formula: ConditionValue;

    private _parent: ConditionRule;

    constructor(parent: ConditionRule) {
        this._parent = parent;
        this.formula = new ConditionValue('then', this);
    }

    public get variable(): string {
        return this._parent?.variable;
    }

    public getJson(): IConditionElseData {
        return {
            type: this.type,
            formula: this.formula.getJson(),
        }
    }

    public static fromData(parent: ConditionRule, data: IConditionElseData): ConditionElse {
        const item = new ConditionElse(parent);
        item.formula = ConditionValue.fromData('then', item, data.formula);
        return item;
    }

    public static fromConditions(
        parent: ConditionRule,
        data?: (IConditionIfData | IConditionElseData)[]
    ): ConditionElse {
        if (Array.isArray(data)) {
            const item = data.find((e) => e.type === 'else');
            if (item) {
                return ConditionElse.fromData(parent, item as IConditionElseData);
            }
        }
        return new ConditionElse(parent);
    }
}

export class ConditionRule {
    public readonly type = 'condition';
    public conditions: (IConditionIfData | IConditionElseData)[];
    public if: ConditionIf[];
    public else: ConditionElse;

    private _parent: FieldRule;

    constructor(parent: FieldRule) {
        this._parent = parent;
        this.conditions = [];
        this.if = [new ConditionIf(this)];
        this.else = new ConditionElse(this);
    }

    public get variable(): string {
        return this._parent?.id;
    }

    public getJson(): IConditionRuleData {
        return {
            type: this.type,
            conditions: [
                ...(this.if.map((e) => e.getJson())),
                this.else.getJson()
            ]
        }
    }

    public static fromData(
        parent: FieldRule,
        data: IConditionRuleData
    ): ConditionRule {
        const item = new ConditionRule(parent);
        item.conditions = data.conditions || [];
        item.if = ConditionIf.fromConditions(item, data.conditions);
        item.else = ConditionElse.fromConditions(item, data.conditions);
        return item;
    }

    public addCondition() {
        this.if.push(new ConditionIf(this));
    }

    public deleteCondition(item: ConditionIf) {
        if (this.if.length > 1) {
            this.if = this.if.filter((e) => e !== item)
        }
    }
}

export class FormulaRule {
    public readonly type = 'formula';
    public formula: string;

    private _parent: FieldRule;

    constructor(parent: FieldRule) {
        this._parent = parent;
        this.formula = '';
    }

    public get variable(): string {
        return this._parent?.id;
    }

    public getJson(): IFormulaRuleData {
        return {
            type: this.type,
            formula: this.formula
        }
    }

    public static fromData(parent: FieldRule, data: IFormulaRuleData): FormulaRule {
        const item = new FormulaRule(parent);
        item.formula = data.formula;
        return item;
    }
}

export class RangeRule {
    public readonly type = 'range';
    public min: string | number;
    public max: string | number;

    private _parent: FieldRule;

    constructor(parent: FieldRule) {
        this._parent = parent;
        this.min = 0;
        this.max = 0;
    }

    public get variable(): string {
        return this._parent?.id;
    }

    public getJson(): IRangeRuleData {
        return {
            type: this.type,
            min: this.min,
            max: this.max
        }
    }

    public static fromData(parent: FieldRule, data: IRangeRuleData): RangeRule {
        const item = new RangeRule(parent);
        item.min = data.min;
        item.max = data.max;
        return item;
    }
}

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
        }
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
