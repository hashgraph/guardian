import { DocumentFieldVariable } from './document-field-validator.js';
import { FieldRuleResult } from './interfaces/status.js';
import { FieldValidator } from './field-validator.js';
import { ISchemaRuleData } from '../../interface/index.js';

export class DocumentFieldValidators {
    public readonly rules: FieldValidator[];
    public readonly variables: DocumentFieldVariable[];
    public readonly idToPath: Map<string, string>;
    public readonly pathToId: Map<string, string>;

    constructor(rules?: ISchemaRuleData[]) {
        const variables = rules || [];

        this.rules = [];
        this.variables = [];
        for (const variable of variables) {
            this.rules.push(new FieldValidator(variable));
            this.variables.push(new DocumentFieldVariable(variable));
        }
        this.idToPath = new Map<string, string>();
        this.pathToId = new Map<string, string>();
        for (const variable of this.variables) {
            this.idToPath.set(variable.id, variable.fullPah);
            this.pathToId.set(variable.fullPah, variable.id);
        }
    }

    public validate(scope: any): { [x: string]: FieldRuleResult; } {
        const result: { [x: string]: FieldRuleResult; } = {};
        for (const rule of this.rules) {
            result[rule.id] = rule.validate(scope);
        }
        return result;
    }

    public validateWithFullPath(scope: any): { [x: string]: FieldRuleResult; } {
        const result: { [x: string]: FieldRuleResult; } = {};
        for (const rule of this.rules) {
            const path = this.idToPath.get(rule.id) || rule.id;
            result[path] = rule.validate(scope);
        }
        return result;
    }
}