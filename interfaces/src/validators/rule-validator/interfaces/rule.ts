import { IConditionRuleData, IFormulaRuleData, IRangeRuleData } from '../../../interface/index.js';

export type IVariableRuleData = IFormulaRuleData | IConditionRuleData | IRangeRuleData | undefined;