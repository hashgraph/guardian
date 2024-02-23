import { SubjectSchemaLoader } from './subject-schema-loader';

/**
 * VC schema loader
 */
export class VCSchemaLoader extends SubjectSchemaLoader {
    constructor(contexts: string[] = []) {
        super(contexts, 'vc');
    }

    /**
     * Get document
     * @param context
     * @param iri
     * @param type
     */
    public override async get(context: string | string[], iri: string, type: string): Promise<any> {
        return this.vcSchema(super.get(context, iri, type));
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
