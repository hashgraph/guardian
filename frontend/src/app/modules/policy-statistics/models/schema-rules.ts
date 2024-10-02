import { IRuleData, RuleType } from "@guardian/interfaces";
import { SchemaVariables } from "./schema-variables";

export class SchemaRule implements IRuleData {
    public schemaId: string;
    public type: RuleType;
    public unique: boolean | string;

    constructor(schemaId: string) {
        this.schemaId = schemaId;
        this.type = RuleType.Unrelated;
        this.unique = "false";
    }

    public getJson(): IRuleData {
        return {
            type: this.type,
            unique: this.unique === true || this.unique === 'true',
            schemaId: this.schemaId
        }
    }

    public static fromData(data: IRuleData): SchemaRule {
        const rule = new SchemaRule(data.schemaId);
        rule.type = data.type || RuleType.Unrelated;
        rule.unique = String(data.unique);
        return rule;
    }
}

export class SchemaRules {
    public rules: Map<string, SchemaRule>;

    constructor() {
        this.rules = new Map<string, SchemaRule>();
    }

    get(id: string): SchemaRule | undefined {
        return this.rules.get(id);
    }

    public fromData(data: IRuleData[] | undefined) {
        this.rules.clear()
        if (data) {
            for (const item of data) {
                const rule = SchemaRule.fromData(item)
                this.rules.set(rule.schemaId, rule);
            }
        }
    }

    public getJson(): IRuleData[] {
        const result: IRuleData[] = []
        for (const item of this.rules.values()) {
            result.push(item.getJson());
        }
        return result;
    }

    public add(schemaId: string) {
        if (!this.rules.has(schemaId)) {
            this.rules.set(schemaId, new SchemaRule(schemaId));
        }
    }

    public update(variables: SchemaVariables) {
        const schemas = new Set<string>();
        for (const variable of variables.variables) {
            schemas.add(variable.schemaId);
        }
        for (const schemaId of this.rules.keys()) {
            if (!schemas.has(schemaId)) {
                this.rules.delete(schemaId)
            }
        }
        for (const schemaId of schemas) {
            if (!this.rules.has(schemaId)) {
                this.rules.set(schemaId, new SchemaRule(schemaId));
            }
        }
    }
}