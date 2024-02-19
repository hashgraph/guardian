import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { SchemaLoader } from '../hedera-modules';
import { DataBaseHelper } from '../helpers';

/**
 * VC schema loader
 */
export class VCSchemaLoader extends SchemaLoader {
    /**
     * Get document
     * @param context
     * @param iri
     * @param type
     */
    public async get(context: string | string[], iri: string, type: string): Promise<any> {
        const _iri = '#' + iri;
        const _context = Array.isArray(context) ? context : [context];
        const schemas = await this.loadSchemaContexts(_context, _iri);

        if (!schemas || !schemas.length) {
            throw new Error(`Schema not found: ${_context.join(',')}, ${_iri}`);
        }

        const schema = schemas[0];

        if (!schema.document) {
            throw new Error('Document not found');
        }
        const document = schema.document;
        return this.vcSchema(document);
    }

    /**
     * Load schema contexts
     * @param contexts
     * @private
     */
    private async loadSchemaContexts(contexts: string[], iri: string): Promise<ISchema[]> {
        try {
            if (contexts && contexts.length) {
                const localSchema = contexts.find((context) => context.startsWith('schema#') || context.startsWith('schema:'));
                if (localSchema) {
                    return await new DataBaseHelper(Schema).find({ iri });
                } else {
                    return await new DataBaseHelper(Schema).find({
                        contextURL: { $in: contexts },
                        iri: { $eq: iri },
                    });
                }
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }

    /**
     * VC schema
     * @param document
     * @private
     */
    private vcSchema(document: any): any {
        const def = {};
        def[document.$id] = document;
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
                                'group': {
                                    'type': 'string',
                                },
                            },
                            'required': ['id'],
                        },
                    ],
                },
                'issuanceDate': { 'type': 'string' },
                'credentialSubject': {
                    'oneOf': [
                        {
                            '$ref': document.$id
                        },
                        {
                            'type': 'array',
                            'items': {
                                '$ref': document.$id
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
