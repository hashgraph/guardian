import { Formula } from 'src/app/utils';
import {
    IConditionEnum,
    IConditionFormula,
    IConditionRange,
    IConditionRuleData,
    IConditionText,
    IFormulaRuleData,
    IRangeRuleData,
    ISchemaRuleData,
    IVC,
    IVCDocument
} from '@guardian/interfaces';

enum FieldRuleResult {
    None = 'None',
    Error = 'Error',
    Failure = 'Failure',
    Success = 'Success',
}

export interface SchemaRuleValidateResult {
    [path: string]: {
        status: FieldRuleResult;
        tooltip: string;
        rules: {
            name: string;
            description: string;
            status: string;
        }[]
    }
}

abstract class AbstractFieldRule {
    public readonly id: string;
    public readonly path: string;
    public readonly schemaId: string;
    public readonly rule: IFormulaRuleData | IConditionRuleData | IRangeRuleData | undefined;

    private type: 'formula' | 'range' | 'condition' | 'none';
    private formula: string;
    private conditions: {
        type: 'if' | 'else',
        if: string;
        then: string;
    }[];

    constructor(rule: ISchemaRuleData) {
        this.id = rule.id;
        this.path = rule.path;
        this.schemaId = rule.schemaId;
        this.rule = rule.rule;
        this.parse();
    }

    abstract calculate(formula: string, scope: any): FieldRuleResult;

    private parse() {
        if (!this.rule) {
            return;
        }
        if (this.rule.type === 'formula') {
            this.type = 'formula';
            this.formula = this.rule.formula;
        } else if (this.rule.type === 'range') {
            this.type = 'range';
            this.formula = `${this.rule.min} <= ${this.id} <= ${this.rule.max}`;
        } else if (this.rule.type === 'condition') {
            this.type = 'condition';
            this.conditions = [];
            const conditions = this.rule.conditions || [];
            for (const condition of conditions) {
                if (condition.type === 'if') {
                    this.conditions.push({
                        type: 'if',
                        if: this.parseCondition(condition.condition),
                        then: this.parseCondition(condition.formula)
                    })
                } else if (condition.type === 'else') {
                    this.conditions.push({
                        type: 'else',
                        if: '',
                        then: this.parseCondition(condition.formula)
                    })
                }
            }
        } else {
            this.type = 'none';
        }
    }

    private parseCondition(condition: IConditionFormula | IConditionRange | IConditionText | IConditionEnum): string {
        if (!condition) {
            return '';
        }
        if (condition.type === 'formula') {
            return condition.formula;
        } else if (condition.type === 'range') {
            return `${condition.min} <= ${condition.variable} <= ${condition.max}`;
        } else if (condition.type === 'text') {
            return `${condition.variable} == '${condition.value}'`;
        } else if (condition.type === 'enum') {
            const items = [];
            if (Array.isArray(condition.value)) {
                for (const value of condition.value) {
                    items.push(`${condition.variable} == '${value}'`)
                }
            }
            return items.join(' or ');
        } else {
            return '';
        }
    }

    public checkField(path: string, schema?: string): boolean {
        if (schema) {
            return this.path === path && this.schemaId === schema;
        } else {
            return this.path === path;
        }
    }

    public validate(scope: any): FieldRuleResult {
        if (this.type === 'none') {
            return FieldRuleResult.None;
        }

        if (this.type === 'formula') {
            return this.calculate(this.formula, scope);
        }

        if (this.type === 'range') {
            return this.calculate(this.formula, scope);
        }

        if (this.type === 'condition') {
            for (const condition of this.conditions) {
                const _if = condition.type === 'if' ?
                    this.calculate(condition.if, scope) :
                    FieldRuleResult.Success;

                if (_if === FieldRuleResult.Error) {
                    return FieldRuleResult.Error;
                }
                if (_if === FieldRuleResult.Success) {
                    return this.calculate(condition.then, scope);
                }
            }
            return FieldRuleResult.None;
        }

        return FieldRuleResult.None;
    }
}

export class FieldRuleValidator extends AbstractFieldRule {
    public override calculate(formula: string, scope: any): FieldRuleResult {
        try {
            if (!formula) {
                return FieldRuleResult.None;
            }
            const result: any = Formula.evaluate(formula, scope);
            if (result === '' || result === 'Incorrect formula') {
                return FieldRuleResult.Error;
            }
            if (result === 0 || result === false || result === '0' || result === 'false') {
                return FieldRuleResult.Failure;
            }
            if (result) {
                return FieldRuleResult.Success
            }
            return FieldRuleResult.Error;
        } catch (error) {
            return FieldRuleResult.Error;
        }
    }
}

export class FieldVariable {
    public readonly id: string;
    public readonly schemaId: string;
    public readonly path: string;
    public readonly fullPah: string;
    public readonly fieldRef: boolean;
    public readonly fieldArray: boolean;
    public readonly fieldDescription: string;
    public readonly schemaName: string;

    constructor(variable: ISchemaRuleData) {
        this.id = variable.id;
        this.schemaId = variable.schemaId;
        this.path = variable.path;
        this.fullPah = variable.schemaId + '/' + variable.path;
        this.fieldRef = variable.fieldRef;
        this.fieldArray = variable.fieldArray;
        this.fieldDescription = variable.fieldDescription;
        this.schemaName = variable.schemaName;
    }
}

export class FieldRuleValidators {
    public readonly rules: FieldRuleValidator[];
    public readonly variables: FieldVariable[];
    public readonly idToPath: Map<string, string>;
    public readonly pathToId: Map<string, string>;

    constructor(rules?: ISchemaRuleData[]) {
        const variables = rules || [];

        this.rules = [];
        this.variables = [];
        for (const variable of variables) {
            this.rules.push(new FieldRuleValidator(variable));
            this.variables.push(new FieldVariable(variable));
        }
        this.idToPath = new Map<string, string>();
        this.pathToId = new Map<string, string>();
        for (const variable of this.variables) {
            this.idToPath.set(variable.id, variable.fullPah);
            this.pathToId.set(variable.fullPah, variable.id);
        }
    }

    public validate(scope: any): { [x: string]: FieldRuleResult } {
        const result: { [x: string]: FieldRuleResult } = {};
        for (const rule of this.rules) {
            result[rule.id] = rule.validate(scope);
        }
        return result;
    }

    public validateWithFullPath(scope: any): { [x: string]: FieldRuleResult } {
        const result: { [x: string]: FieldRuleResult } = {};
        for (const rule of this.rules) {
            const path = this.idToPath.get(rule.id) || rule.id;
            result[path] = rule.validate(scope);
        }
        return result;
    }
}

export class SchemaRuleValidator {
    public readonly name: string;
    public readonly description: string;
    public readonly schemas: Set<string>;
    public readonly validators: FieldRuleValidators;
    public readonly relationships: Map<string, IVCDocument>;

    constructor(data: any) {
        const item = data.rules || {};
        const configuration = item.config || {};
        const relationships = data.relationships || [];


        this.relationships = new Map<string, IVCDocument>()
        for (const document of relationships) {
            SchemaRuleValidator.convertDocument(
                SchemaRuleValidator.getCredentialSubject(document?.document),
                document?.schema + '/',
                this.relationships
            );
        }

        this.name = item.name;
        this.description = item.description;
        this.validators = new FieldRuleValidators(configuration.fields);
        this.schemas = new Set<string>();
        for (const variable of this.validators.variables) {
            this.schemas.add(variable.schemaId);
        }
    }

    public validate(iri: string | undefined, list: Map<string, any>) {
        if (!iri || !this.schemas.has(iri)) {
            return null;
        }
        const score: { [id: string]: any } = {};
        for (const variable of this.validators.variables) {
            if (list.has(variable.fullPah)) {
                score[variable.id] = list.get(variable.fullPah);
            } else if (this.relationships.has(variable.fullPah)) {
                score[variable.id] = this.relationships.get(variable.fullPah);
            } else {
                score[variable.id] = null;
            }
        }
        return this.validators.validateWithFullPath(score);
    }

    public static getCredentialSubject(document?: IVC): any {
        let credentialSubject: any = document?.credentialSubject;
        if (Array.isArray(credentialSubject)) {
            return credentialSubject[0];
        } else {
            credentialSubject;
        }
    }

    public static convertDocument(
        document: any,
        path: string,
        list: Map<string, any>
    ): Map<string, any> {
        if (!document) {
            return list;
        }
        for (const [key, value] of Object.entries(document)) {
            const currentPath = path + key;
            switch (typeof value) {
                case 'function': {
                    break;
                }
                case 'object': {
                    list.set(currentPath, value);
                    if (!Array.isArray(value)) {
                        SchemaRuleValidator.convertDocument(value, currentPath + '.', list);
                    }
                    break;
                }
                default: {
                    list.set(currentPath, value);
                    break;
                }
            }
        }
        return list;
    }
}

export class SchemaRuleValidators {
    public schemas: Set<string | undefined>;
    public validators: SchemaRuleValidator[];

    constructor(data: any[] | null) {
        this.validators = (data || []).map((v) => new SchemaRuleValidator(v));
        this.schemas = new Set<string>();
        for (const validator of this.validators) {
            for (const iri of validator.schemas) {
                this.schemas.add(iri);
            }
        }
    }

    public validateVC(iri: string | undefined, vc: any): any {
        if (this.validators.length === 0) {
            return null;
        }
        if (!iri || !this.schemas.has(iri)) {
            return null;
        }
        const data = SchemaRuleValidator.getCredentialSubject(vc);
        const list = SchemaRuleValidator.convertDocument(data, iri + '/', new Map<string, any>());
        return this.validate(iri, list);
    }

    public validateForm(iri: string | undefined, data: any): any {
        if (this.validators.length === 0) {
            return null;
        }
        if (!iri || !this.schemas.has(iri)) {
            return null;
        }
        const list = SchemaRuleValidator.convertDocument(data, iri + '/', new Map<string, any>());
        return this.validate(iri, list);
    }

    private validate(iri: string | undefined, list: Map<string, any>): any {
        const results = [];
        for (const validator of this.validators) {
            results.push(validator.validate(iri, list));
        }

        const statuses: SchemaRuleValidateResult = {};
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const validator = this.validators[i];
            if (result) {
                for (const [path, status] of Object.entries(result)) {
                    if (status !== FieldRuleResult.None) {
                        if (statuses[path]) {
                            if (status === FieldRuleResult.Error || status === FieldRuleResult.Failure) {
                                statuses[path].status = status;
                            }
                            statuses[path].rules.push({
                                name: validator.name,
                                description: validator.description,
                                status: status,
                            })
                        } else {
                            statuses[path] = {
                                status: status,
                                tooltip: '',
                                rules: [{
                                    name: validator.name,
                                    description: validator.description,
                                    status: status,
                                }]
                            }
                        }
                    }
                }
            }
        }
        return statuses;
    }
}