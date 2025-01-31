import { GroupItemValidator } from '../item-group-validator.js';
import { LabelItemValidator } from '../item-label-validator.js';
import { NodeItemValidator } from '../item-node-validator.js';
import { RuleItemValidator } from '../item-rule-validator.js';
import { StatisticItemValidator } from '../item-statistic-validator.js';

export type IValidator = (
    GroupItemValidator |
    LabelItemValidator |
    RuleItemValidator |
    StatisticItemValidator |
    NodeItemValidator
);