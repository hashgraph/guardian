import { IFormulaData, IFormulaRuleData, IConditionRuleData, IRangeRuleData } from "@guardian/interfaces";
import { FieldRuleResult } from "../rule-validator/interfaces/status";

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

    public static from(data?: IFormulaData[]): FormulaData[] {
        if (Array.isArray(data)) {
            return data.map((e) => new FormulaData(e));
        }
        return [];
    }
}
