import { GroupItemValidator } from '../item-group-validator';
import { LabelItemValidator } from '../item-label-validator';
import { NodeItemValidator } from '../item-node-validator';
import { RuleItemValidator } from '../item-rule-validator';
import { StatisticItemValidator } from '../item-statistic-validator';

export type IValidator = (
    GroupItemValidator |
    LabelItemValidator |
    RuleItemValidator |
    StatisticItemValidator |
    NodeItemValidator
);