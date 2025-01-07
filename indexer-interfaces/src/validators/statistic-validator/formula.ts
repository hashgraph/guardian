import { FieldRuleResult, IConditionRuleData, IFormulaData, IFormulaRuleData, IRangeRuleData } from '../interfaces/index.js';

export class FormulaData implements IFormulaData {
    public id: string;
    public type: string;
    public description: string;
    public formula: string;
    public rule?: IFormulaRuleData | IConditionRuleData | IRangeRuleData;

    public value: any;
    public status: FieldRuleResult;

    constructor(item: IFormulaData) {
        this.id = item.id;
        this.type = item.type;
        this.description = item.description;
        this.formula = item.formula;
        this.rule = item.rule;
    }

    public setValue(value: any): void {
        this.value = value;
    }

    public getValue(): any {
        return this.value;
    }

    public validate(value: any): boolean {
        return this.value === value;
    }

    public static from(data?: IFormulaData[]): FormulaData[] {
        if (Array.isArray(data)) {
            return data.map((e) => new FormulaData(e));
        }
        return [];
    }
}
