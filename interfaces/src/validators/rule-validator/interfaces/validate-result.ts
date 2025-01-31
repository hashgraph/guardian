import { FieldRuleResult } from './status.js';

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
