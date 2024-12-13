import { IFormulaRuleData, IConditionRuleData, IRangeRuleData } from '@guardian/interfaces';

export type IRuleData = IFormulaRuleData | IConditionRuleData | IRangeRuleData | undefined;