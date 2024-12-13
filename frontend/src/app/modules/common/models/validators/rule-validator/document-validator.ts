import { IVCDocument, IVC } from '@guardian/interfaces';
import { DocumentFieldValidators } from './document-field-validators';

export class DocumentValidator {
    public readonly name: string;
    public readonly description: string;
    public readonly schemas: Set<string>;
    public readonly validators: DocumentFieldValidators;
    public readonly relationships: Map<string, IVCDocument>;

    constructor(data: any) {
        const item = data.rules || {};
        const configuration = item.config || {};
        const relationships = data.relationships || [];


        this.relationships = new Map<string, IVCDocument>();
        for (const document of relationships) {
            DocumentValidator.convertDocument(
                DocumentValidator.getCredentialSubject(document?.document),
                document?.schema + '/',
                this.relationships
            );
        }

        this.name = item.name;
        this.description = item.description;
        this.validators = new DocumentFieldValidators(configuration.fields);
        this.schemas = new Set<string>();
        for (const variable of this.validators.variables) {
            this.schemas.add(variable.schemaId);
        }
    }

    public validate(iri: string | undefined, list: Map<string, any>) {
        if (!iri || !this.schemas.has(iri)) {
            return null;
        }
        const score: { [id: string]: any; } = {};
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
                        DocumentValidator.convertDocument(value, currentPath + '.', list);
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
