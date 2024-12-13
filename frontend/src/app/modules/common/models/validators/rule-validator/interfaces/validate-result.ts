import { FieldRuleResult } from './status';

export interface SchemaRuleValidateResult {
    [path: string]: {
        status: FieldRuleResult;
        tooltip: string;
        rules: {
            name: string;
            description: string;
            status: string;
        }[];
    };
}
