
import { IFormulaData } from '../interfaces/index.js';
import { RuleValidator } from '../rule-validator/rule-validator.js';

export class FormulaValidator extends RuleValidator {
    constructor(formula: IFormulaData) {
        super(formula.id, formula.rule);
    }
}