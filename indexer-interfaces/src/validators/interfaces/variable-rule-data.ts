import { IFormulaRuleData, IConditionRuleData, IRangeRuleData } from './schema-rules.js';

export type IVariableRuleData = IFormulaRuleData | IConditionRuleData | IRangeRuleData | undefined;