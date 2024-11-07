import { ISchemaRulesConfig } from './schema-rules.interface';
import { IStatisticConfig } from './statistic.interface';

export interface IPolicyLabelConfig extends IStatisticConfig, ISchemaRulesConfig  {
}

export interface IPolicyLabel {
    id?: string;
    name?: string;
    description?: string;
    instanceTopicId?: string;
    policyId?: string;
    owner?: string;
    status?: string;
    config?: IPolicyLabelConfig;
}