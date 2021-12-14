import { SchemaLoader } from 'vc-modules';
import { Schema } from '@entity/schema';
import { MongoRepository } from 'typeorm';

/**
 * VC documents loader
 */
export class SchemaObjectLoader extends SchemaLoader {
    private schemaRepository: MongoRepository<Schema>;

    constructor(
        schemaRepository: MongoRepository<Schema>
    ) {
        super();
        this.schemaRepository = schemaRepository;
    }

    public async get(type: string): Promise<any> {
        const schemes = await this.schemaRepository.find();
        const documents = schemes.map(s=>JSON.parse(s.document))
        const def = {};
        for (let i = 0; i < documents.length; i++) {
            const element = documents[i];
            def[element['$id']] = element;
        }
        const schema = {
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
                            "$ref": "#" + type
                        },
                        {
                            'type': 'array',
                            'items': {
                                "$ref": "#" + type
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
        return schema;
    }
}
