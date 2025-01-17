import {
    IConditionElseData,
    IConditionEnum,
    IConditionFormula,
    IConditionIfData,
    IConditionRange,
    IConditionRuleData,
    IConditionText,
    IFormulaRuleData,
    IRangeRuleData
} from "@guardian/interfaces";
import { FieldRule } from "./field-rule";
import { SchemaFormula } from "./schema-formulas";

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
        this._parent = parent;
        this.type = 'formula';
        this.max = 0;
        this.min = 0;
        this.text = '';
        this.enum = [];
        this.formula = '';
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

    private _parent: FieldRule | SchemaFormula;

    constructor(parent: FieldRule | SchemaFormula) {
        this._parent = parent;
        this.conditions = [];
        this.if = [new ConditionIf(this)];
        this.else = new ConditionElse(this);
    }

    public get variable(): string {
        return this._parent?.id;
    }

    public setParent(parent: FieldRule | SchemaFormula) {
        this._parent = parent;
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
        parent: FieldRule | SchemaFormula,
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

    private _parent: FieldRule | SchemaFormula;

    constructor(parent: FieldRule | SchemaFormula) {
        this._parent = parent;
        this.formula = '';
    }

    public get variable(): string {
        return this._parent?.id;
    }

    public setParent(parent: FieldRule | SchemaFormula) {
        this._parent = parent;
    }

    public getJson(): IFormulaRuleData {
        return {
            type: this.type,
            formula: this.formula
        }
    }

    public static fromData(
        parent: FieldRule | SchemaFormula,
        data: IFormulaRuleData
    ): FormulaRule {
        const item = new FormulaRule(parent);
        item.formula = data.formula;
        return item;
    }
}

export class RangeRule {
    public readonly type = 'range';
    public min: string | number;
    public max: string | number;

    private _parent: FieldRule | SchemaFormula;

    constructor(parent: FieldRule | SchemaFormula) {
        this._parent = parent;
        this.min = 0;
        this.max = 0;
    }

    public get variable(): string {
        return this._parent?.id;
    }

    public setParent(parent: FieldRule | SchemaFormula) {
        this._parent = parent;
    }

    public getJson(): IRangeRuleData {
        return {
            type: this.type,
            min: this.min,
            max: this.max
        }
    }

    public static fromData(
        parent: FieldRule | SchemaFormula,
        data: IRangeRuleData
    ): RangeRule {
        const item = new RangeRule(parent);
        item.min = data.min;
        item.max = data.max;
        return item;
    }
}