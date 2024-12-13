import { SchemaRuleValidateResult } from './interfaces/validate-result';
import { FieldRuleResult } from './interfaces/status';
import { DocumentValidator } from './document-validator';

export class DocumentValidators {
    public schemas: Set<string | undefined>;
    public validators: DocumentValidator[];

    constructor(data: any[] | null) {
        this.validators = (data || []).map((v) => new DocumentValidator(v));
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
        const data = DocumentValidator.getCredentialSubject(vc);
        const list = DocumentValidator.convertDocument(data, iri + '/', new Map<string, any>());
        return this.validate(iri, list);
    }

    public validateForm(iri: string | undefined, data: any): any {
        if (this.validators.length === 0) {
            return null;
        }
        if (!iri || !this.schemas.has(iri)) {
            return null;
        }
        const list = DocumentValidator.convertDocument(data, iri + '/', new Map<string, any>());
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
                            });
                        } else {
                            statuses[path] = {
                                status: status,
                                tooltip: '',
                                rules: [{
                                    name: validator.name,
                                    description: validator.description,
                                    status: status,
                                }]
                            };
                        }
                    }
                }
            }
        }
        return statuses;
    }
}
