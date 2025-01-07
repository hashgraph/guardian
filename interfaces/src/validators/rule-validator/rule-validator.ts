import { IVariableRuleData } from './interfaces/rule.js';
import { FieldRuleResult } from './interfaces/status.js';
import { FormulaEngine } from '../utils/formula.js';
import { FormulaType } from './interfaces/formula-type.js';
import { IConditionEnum, IConditionFormula, IConditionRange, IConditionText } from '../../interface/index.js';

export class RuleValidator {
    public readonly id: string;
    public readonly rule: IVariableRuleData;

    private type: FormulaType;
    private formula: string;
    private conditions: {
        type: 'if' | 'else';
        if: string;
        then: string;
    }[];

    constructor(id: string, rule: IVariableRuleData) {
        this.id = id;
        this.rule = rule;
        this.parse();
    }

    private parse() {
        if (!this.rule) {
            return;
        }
        if (this.rule.type === 'formula') {
            this.type = FormulaType.Formula;
            this.formula = this.rule.formula;
        } else if (this.rule.type === 'range') {
            this.type = FormulaType.Range;
            this.formula = `${this.rule.min} <= ${this.id} <= ${this.rule.max}`;
        } else if (this.rule.type === 'condition') {
            this.type = FormulaType.Condition;
            this.conditions = [];
            const conditions = this.rule.conditions || [];
            for (const condition of conditions) {
                if (condition.type === 'if') {
                    this.conditions.push({
                        type: 'if',
                        if: this.parseCondition(condition.condition),
                        then: this.parseCondition(condition.formula)
                    });
                } else if (condition.type === 'else') {
                    this.conditions.push({
                        type: 'else',
                        if: '',
                        then: this.parseCondition(condition.formula)
                    });
                }
            }
        } else {
            this.type = FormulaType.None;
        }
    }

    private parseCondition(
        condition: IConditionFormula | IConditionRange | IConditionText | IConditionEnum
    ): string {
        if (!condition) {
            return '';
        }
        if (condition.type === 'formula') {
            return condition.formula;
        } else if (condition.type === 'range') {
            return `${condition.min} <= ${condition.variable} <= ${condition.max}`;
        } else if (condition.type === 'text') {
            return `${condition.variable} == '${condition.value}'`;
        } else if (condition.type === 'enum') {
            const items = [];
            if (Array.isArray(condition.value)) {
                for (const value of condition.value) {
                    items.push(`${condition.variable} == '${value}'`);
                }
            }
            return items.join(' or ');
        } else {
            return '';
        }
    }

    public validate(scope: any): FieldRuleResult {
        if (this.type === FormulaType.None) {
            return FieldRuleResult.None;
        }

        if (this.type === FormulaType.Formula) {
            return this.calculate(this.formula, scope);
        }

        if (this.type === FormulaType.Range) {
            return this.calculate(this.formula, scope);
        }

        if (this.type === FormulaType.Condition) {
            for (const condition of this.conditions) {
                const _if = condition.type === 'if' ?
                    this.calculate(condition.if, scope) :
                    FieldRuleResult.Success;

                if (_if === FieldRuleResult.Error) {
                    return FieldRuleResult.Error;
                }
                if (_if === FieldRuleResult.Success) {
                    return this.calculate(condition.then, scope);
                }
            }
            return FieldRuleResult.None;
        }

        return FieldRuleResult.None;
    }

    private calculate(formula: string, scope: any): FieldRuleResult {
        try {
            if (!formula) {
                return FieldRuleResult.None;
            }
            const result: any = FormulaEngine.evaluate(formula, scope);
            if (result === '' || result === 'Incorrect formula') {
                return FieldRuleResult.Error;
            }
            if (result === 0 || result === false || result === '0' || result === 'false') {
                return FieldRuleResult.Failure;
            }
            if (result) {
                return FieldRuleResult.Success;
            }
            return FieldRuleResult.Error;
        } catch (error) {
            return FieldRuleResult.Error;
        }
    }
}