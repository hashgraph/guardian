import { ISchemaRuleData } from '../interfaces/index.js';
import { RuleValidator } from './rule-validator.js';

export class FieldValidator extends RuleValidator {
    public readonly path: string;
    public readonly schemaId: string;

    constructor(rule: ISchemaRuleData) {
        super(rule.id, rule.rule);
        this.path = rule.path;
        this.schemaId = rule.schemaId;
    }

    public checkField(path: string, schema?: string): boolean {
        if (schema) {
            return this.path === path && this.schemaId === schema;
        } else {
            return this.path === path;
        }
    }
}
