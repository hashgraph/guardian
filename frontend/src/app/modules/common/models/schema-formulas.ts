import { IConditionRuleData, IFormulaData, IFormulaRuleData, IRangeRuleData } from "@guardian/interfaces";
import { ConditionRule, FormulaRule, RangeRule } from "./conditions";

export class SchemaFormula implements IFormulaData {
    public id: string;
    public type: string;
    public description: string;
    public formula: string;
    public index: number;

    public rule?: FormulaRule | ConditionRule | RangeRule;

    constructor() {
        this.type = 'string';
    }

    public get ruleType(): string {
        if (this.rule) {
            return this.rule.type;
        } else {
            return '';
        }
    }

    public getJson(): IFormulaData {
        if (this.rule) {
            return {
                id: this.id,
                type: this.type,
                description: this.description,
                formula: this.formula,
                rule: this.rule.getJson()
            }
        } else {
            return {
                id: this.id,
                type: this.type,
                description: this.description,
                formula: this.formula
            }
        }
    }

    public static fromData(data: IFormulaData): SchemaFormula {
        const formula = new SchemaFormula();
        formula.id = data.id;
        formula.type = data.type || 'string';
        formula.description = data.description;
        formula.formula = data.formula;
        formula.rule = this.parsRule(formula, data.rule);
        return formula;
    }

    private static parsRule(
        parent: SchemaFormula,
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

    public clone(): SchemaFormula {
        return SchemaFormula.fromData(this.getJson());
    }
}

export class SchemaFormulas {
    private readonly symbol = 'C';
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
        // this.add();
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
        formula.description = '';
        formula.formula = '';
        this.formulas.push(formula);
    }
    public delete(formula: SchemaFormula) {
        this.formulas = this.formulas.filter((f) => f !== formula);
        if (this.formulas.length === 0) {
            this.setDefault();
        }
    }

    public fromData(data: IFormulaData[] | undefined) {
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
            this.setDefault();
        }
    }

    public getJson(): any[] {
        return this.formulas.filter((f) => f.description || f.formula).map((f) => f.getJson());
    }
}