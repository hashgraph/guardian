import { GroupItemValidator } from '../label-validator/item-group-validator.js';
import { LabelItemValidator } from '../label-validator/item-label-validator.js';
import { NodeItemValidator } from '../label-validator/item-node-validator.js';
import { RuleItemValidator } from '../label-validator/item-rule-validator.js';
import { StatisticItemValidator } from '../label-validator/item-statistic-validator.js';

export type IValidator = (
    GroupItemValidator |
    LabelItemValidator |
    RuleItemValidator |
    StatisticItemValidator |
    NodeItemValidator
);