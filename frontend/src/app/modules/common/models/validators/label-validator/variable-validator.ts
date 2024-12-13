import { IFormulaData } from '@guardian/interfaces';
import { RuleValidator } from '../rule-validator/rule-validator';

export class FormulaValidator extends RuleValidator {
    constructor(formula: IFormulaData) {
        super(formula.id, formula.rule);
    }
}