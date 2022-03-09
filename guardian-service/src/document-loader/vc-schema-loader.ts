import { SchemaLoader } from 'vc-modules';
import { Schema } from '@entity/schema';
import { getMongoRepository, MongoRepository } from 'typeorm';
import { ISchema } from 'interfaces';

/**
 * VC schema loader
 */
export class VCSchemaLoader extends SchemaLoader {
    constructor(
        private readonly context: string
    ) {
        super();
    }

    public async has(context: string | string[], iri: string, type: string): Promise<boolean> {
        if (type !== 'vc') {
            return false;
        }
        if (Array.isArray(context)) {
            for (let i = 0; i < context.length; i++) {
                const element = context[i];
                if (element.startsWith(this.context)) {
                    return true;
                }
            }
        } else {
            return context && context.startsWith(this.context);
        }
        return false;
    }

    public async get(context: string | string[], iri: string, type: string): Promise<any> {
        let schemes: ISchema[];
        if (typeof context == 'string') {
            schemes = await this.loadSchemaContexts([context]);
        } else {
            schemes = await this.loadSchemaContexts(context);
        }

        if (!schemes) {
            throw new Error('Schema not found');
        }

        const _iri = '#' + iri;
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            if (schema.iri === _iri) {
                if (!schema.document) {
                    throw new Error('Document not found');
                }
                const document = JSON.parse(schema.document);
                return this.vcSchema(document);
            }
        }

        throw new Error('IRI Schema not found');
    }

    private async loadSchemaContexts(context: string[]): Promise<ISchema[]> {
        try {
            if (!context) {
                return null;
            }
            const schema = await getMongoRepository(Schema).find({
                where: { contextURL: { $in: context } }
            });
            return schema
        }
        catch (error) {
            return null;
        }
    }

    private vcSchema(document: any): any {
        const def = {};
        def[document['$id']] = document;
        return {
            'type': 'object',
            'properties': {
                '@context': {
                    'oneOf': [
                        {
                            'type': 'string',
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string',
                            }
                        },
                    ],
                },
                'id': {
                    'type': 'string',
                },
                'type': {
                    'oneOf': [
                        {
                            'type': 'string',
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string',
                            }
                        },
                    ],
                },
                'issuer': {
                    'oneOf': [
                        {
                            'type': 'string',
                        },
                        {
                            'type': 'object',
                            'properties': {
                                'id': {
                                    'type': 'string',
                                },
                            },
                        },
                    ],
                },
                'issuanceDate': { 'type': 'string' },
                'credentialSubject': {
                    'oneOf': [
                        {
                            "$ref": document['$id']
                        },
                        {
                            'type': 'array',
                            'items': {
                                "$ref": document['$id']
                            },
                        }
                    ],
                },
                'proof': {
                    'type': 'object',
                    'properties': {
                        'type': {
                            'oneOf': [
                                {
                                    'type': 'string',
                                },
                                {
                                    'type': 'array',
                                    'items': {
                                        'type': 'string',
                                    }
                                },
                            ],
                        },
                        'created': {
                            'type': 'string',
                        },
                        'proofPurpose': {
                            'type': 'string',
                        },
                        'verificationMethod': {
                            'type': 'string',
                        },
                        'jws': {
                            'type': 'string',
                        },
                    },
                    'additionalProperties': false,
                }
            },
            'required': ['@context'],
            'additionalProperties': false,
            '$defs': def
        };
    }
}
