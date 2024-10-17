import { Formula } from 'src/app/utils';
import { IConditionEnum, IConditionFormula, IConditionRange, IConditionRuleData, IConditionText, IFormulaRuleData, IRangeRuleData, ISchemaRuleData } from '@guardian/interfaces';

enum FieldRuleResult {
    None = 'None',
    Error = 'Error',
    Failure = 'Failure',
    Success = 'Success',
}

abstract class AbstractFieldRule {
    public readonly id: string;
    public readonly path: string;
    public readonly schemaId: string;
    public readonly rule: IFormulaRuleData | IConditionRuleData | IRangeRuleData | undefined;

    private type: 'formula' | 'range' | 'condition' | 'none';
    private formula: string;
    private conditions: {
        type: 'if' | 'else',
        if: string;
        then: string;
    }[];

    constructor(rule: ISchemaRuleData) {
        this.id = rule.id;
        this.path = rule.path;
        this.schemaId = rule.schemaId;
        this.rule = rule.rule;
        this.parse();
    }

    abstract calculate(formula: string, scope: any): FieldRuleResult;

    private parse() {
        if (!this.rule) {
            return;
        }
        if (this.rule.type === 'formula') {
            this.type = 'formula';
            this.formula = this.rule.formula;
        } else if (this.rule.type === 'range') {
            this.type = 'range';
            this.formula = `${this.rule.min} <= ${this.id} <= ${this.rule.max}`;
        } else if (this.rule.type === 'condition') {
            this.type = 'condition';
            this.conditions = [];
            const conditions = this.rule.conditions || [];
            for (const condition of conditions) {
                if (condition.type === 'if') {
                    this.conditions.push({
                        type: 'if',
                        if: this.parseCondition(condition.condition),
                        then: this.parseCondition(condition.formula)
                    })
                } else if (condition.type === 'else') {
                    this.conditions.push({
                        type: 'else',
                        if: '',
                        then: this.parseCondition(condition.formula)
                    })
                }
            }
        } else {
            this.type = 'none';
        }
    }

    private parseCondition(condition: IConditionFormula | IConditionRange | IConditionText | IConditionEnum): string {
        if (!condition) {
            return '';
        }
        if (condition.type === 'formula') {
            return condition.formula;
        } else if (condition.type === 'range') {
            return `${condition.min} <= ${condition.variable} <= ${condition.max}`;
        } else if (condition.type === 'text') {
            return `${condition.variable} == ${condition.value}`;
        } else if (condition.type === 'enum') {
            const items = [];
            if (Array.isArray(condition.value)) {
                for (const value of condition.value) {
                    items.push(`${condition.variable} == '${value}'`)
                }
            }
            return items.join(' or ');
        } else {
            return '';
        }
    }

    public checkField(path: string, schema?: string): boolean {
        if (schema) {
            return this.path === path && this.schemaId === schema;
        } else {
            return this.path === path;
        }
    }

    public checkValue(scope: any): FieldRuleResult {
        if (this.type === 'none') {
            return FieldRuleResult.None;
        }

        if (this.type === 'formula') {
            return this.calculate(this.formula, scope);
        }

        if (this.type === 'range') {
            return this.calculate(this.formula, scope);
        }

        if (this.type === 'condition') {
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
}

export class FieldRuleValidator extends AbstractFieldRule {
    public override calculate(formula: string, scope: any): FieldRuleResult {
        try {
            if (!formula) {
                return FieldRuleResult.None;
            }
            const result: any = Formula.evaluate(formula, scope);
            if (result === '' || result === 'Incorrect formula') {
                return FieldRuleResult.Error;
            }
            if (result === 0 || result === false || result === '0' || result === 'false') {
                return FieldRuleResult.Failure;
            }
            if (result) {
                return FieldRuleResult.Success
            }
            return FieldRuleResult.Error;
        } catch (error) {
            return FieldRuleResult.Error;
        }
    }
}


export class FieldRuleValidators {
    private rules: FieldRuleValidator[];
    private variables: ISchemaRuleData[];

    constructor(rules: ISchemaRuleData[]) {
        this.variables = rules || [];
        this.rules = [];
        for (const variable of this.variables) {
            this.rules.push(new FieldRuleValidator(variable));
        }
    }

    public checkValue(scope: any): { [x: string]: FieldRuleResult } {
        const result: { [x: string]: FieldRuleResult } = {};
        for (const rule of this.rules) {
            result[rule.id] = rule.checkValue(scope);
        }
        return result;
    }

    public checkScope(document: any): any {

    }
}