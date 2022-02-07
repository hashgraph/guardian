const {
    VCHelper,
    DefaultDocumentLoader
} = require('../../../dist/index');
const { expect, assert } = require('chai');

class _DocumentLoader {
    context = null;
    document = null;
    constructor(context, document) {
        this.context = context;
        this.document = document;
    }
    has(iri) {
        return iri.startsWith(this.context);
    }
    get(iri) {
        return {
            documentUrl: iri,
            document: this.document,
        };
    }
    static build(documentLoaders) {
        const _documentLoaders = documentLoaders || [];
        return async function (iri) {
            for (let i = 0; i < _documentLoaders.length; i++) {
                const documentLoader = _documentLoaders[i];
                if (documentLoader.has(iri)) {
                    return documentLoader.get(iri);
                }
            }
            throw new Error('IRI not found: ' + iri);
        };
    }
}

class _SchemaLoader {
    context = null;
    document = null;

    constructor(context, document) {
        this.context = context;
        this.document = document;
    }

    has(context, iri, type) {
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

    get(context, iri, type) {
        return this.document;
    }
}


describe('VCHelper', function () {
    let vcHelper, did, privateKey, data;

    before(async function () {
        vcHelper = new VCHelper();
        did = 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001';
        privateKey = '302e020100300506032b6570042204203e33c2cdb749c95c121ce151a39ecb4a1cf6b1241c3e8e20edc3df06f7275509';
        data = {
            '@context': ['https://localhost/schema'],
            'type': 'Test',
            'field1': 'field1',
            'field2': 'field2'
        }
    });

    it('Test DocumentLoaderBuild', async function () {
        const context = 'https://localhost/schema';
        const schemaDocument = {
            '@context': {
                '@version': 1.1,
                'id': '@id',
                'type': '@type',
                'name': 'https://schema.org/name',
                'Test': {
                    '@id': 'https://localhost/schema#Test',
                    '@context': {
                        'field1': {
                            '@id': 'https://www.schema.org/text'
                        },
                        'field2': {
                            '@id': 'https://www.schema.org/text'
                        },
                    }
                },
            }
        }

        const didDoc = {
            '@context': [
                'https://www.w3.org/ns/did/v1',
                'https://ns.did.ai/transmute/v1'
            ],
            'id': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001',
            'verificationMethod': [
                {
                    'id': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001#did-root-key',
                    'type': 'Ed25519VerificationKey2018',
                    'controller': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001',
                    'publicKeyBase58': '2kDCE2VVVdSQbbu217aa6yg6rTTbv4vvpw1nDyEQHCLu'
                }
            ],
            'authentication': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001#did-root-key',
            'assertionMethod': [
                '#did-root-key'
            ]
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
                            '$ref': '#Test'
                        },
                        {
                            'type': 'array',
                            'items': {
                                '$ref': '#Test'
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
            '$defs': {
                '#Test': {
                    '$id': '#Test',
                    '$comment': '{"term": "Test", "@id": "https://localhost/schema#Test"}',
                    'title': '',
                    'description': '',
                    'type': 'object',
                    'properties': {
                        '@context': {
                            'oneOf': [
                                {
                                    'type': 'string'
                                },
                                {
                                    'type': 'array',
                                    'items': {
                                        'type': 'string'
                                    }
                                }
                            ]
                        },
                        'type': {
                            'oneOf': [
                                {
                                    'type': 'string'
                                },
                                {
                                    'type': 'array',
                                    'items': {
                                        'type': 'string'
                                    }
                                }
                            ]
                        },
                        'id': {
                            'type': 'string'
                        },
                        'field1': {
                            '$comment': '{"term": "field1", "@id": "https://www.schema.org/text"}',
                            'title': '',
                            'description': '',
                            'type': 'string'
                        },
                        'field2': {
                            '$comment': '{"term": "field2", "@id": "https://www.schema.org/text"}',
                            'title': '',
                            'description': '',
                            'type': 'string'
                        }
                    },
                    'required': [
                        'field1',
                        'field2'
                    ],
                    'additionalProperties': false
                }
            }
        };

        vcHelper.addContext(context);
        vcHelper.addDocumentLoader(new DefaultDocumentLoader());
        vcHelper.addDocumentLoader(new _DocumentLoader(context, schemaDocument));
        vcHelper.addDocumentLoader(new _DocumentLoader('did:hedera:', didDoc));
        vcHelper.addSchemaLoader(new _SchemaLoader('https://localhost/schema', schema));
        vcHelper.buildDocumentLoader();
        vcHelper.buildSchemaLoader();
        assert.exists(vcHelper.loader);
    });

    it('Test DocumentLoader', async function () {
        assert.exists(await vcHelper.loader('https://www.w3.org/ns/did/v1'));
        assert.exists(await vcHelper.loader('https://ns.did.ai/transmute/v1'));
        assert.exists(await vcHelper.loader('https://localhost/schema'));
        assert.exists(await vcHelper.loader('did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001'));
        let errorIRI = null;
        try {
            errorIRI = await vcHelper.loader('...');
        } catch (error) {
            errorIRI = null;
        }
        assert.notExists(errorIRI);
    });

    it('Test createCredential', async function () {
        const vc = await vcHelper.createCredential(did, 'Test', data);
        assert.exists(vc);
        assert.deepEqual(vc, {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': vc.id,
            'type': [
                'VerifiableCredential'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'type': 'Test',
                    'field1': 'field1',
                    'field2': 'field2'
                }
            ],
            'issuer': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001',
            'issuanceDate': vc.issuanceDate
        });
    });

    it('Test issueCredential', async function () {
        const credential = await vcHelper.createCredential(did, null, data);
        const vc = await vcHelper.issueCredential(did, privateKey, credential);
        assert.exists(vc);
        assert.exists(vc.getProof());
        const root = vc.toJsonTree();
        assert.deepEqual(root, {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': root.id,
            'type': [
                'VerifiableCredential'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'type': 'Test',
                    'field1': 'field1',
                    'field2': 'field2'
                }
            ],
            'issuer': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001',
            'issuanceDate': root.issuanceDate,
            'proof': root.proof
        });
    });

    it('Test createVC', async function () {
        const vc = await vcHelper.createVC(did, privateKey, data);
        assert.exists(vc);
        assert.exists(vc.getProof());
        const root = vc.toJsonTree();
        assert.deepEqual(root, {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': root.id,
            'type': [
                'VerifiableCredential'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'type': 'Test',
                    'field1': 'field1',
                    'field2': 'field2'
                }
            ],
            'issuer': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001',
            'issuanceDate': root.issuanceDate,
            'proof': root.proof
        });
    });

    it('Test createVP', async function () {
        const vc = await vcHelper.createVC(did, privateKey, data);
        const vp = await vcHelper.createVP(did, privateKey, [vc], 'f5630d9a-3c27-4ccc-a371-f4d30c2da4e1');
        assert.exists(vp);
        assert.exists(vp.getProof());

        const rootVC = vc.toJsonTree();
        const root = vp.toJsonTree();

        assert.deepEqual(root, {
            'id': 'f5630d9a-3c27-4ccc-a371-f4d30c2da4e1',
            'type': [
                'VerifiablePresentation'
            ],
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'verifiableCredential': [
                {
                    '@context': [
                        'https://www.w3.org/2018/credentials/v1'
                    ],
                    'id': rootVC.id,
                    'type': [
                        'VerifiableCredential'
                    ],
                    'credentialSubject': [
                        {
                            '@context': [
                                'https://localhost/schema'
                            ],
                            'type': 'Test',
                            'field1': 'field1',
                            'field2': 'field2'
                        }
                    ],
                    'issuer': 'did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001',
                    'issuanceDate': rootVC.issuanceDate,
                    'proof': rootVC.proof
                }
            ],
            'proof': root.proof
        });
    });

    it('Test verifyVC', async function () {
        const vc = await vcHelper.createVC(did, privateKey, data);

        let verify = await vcHelper.verifyVC(vc);
        assert.equal(verify, true);

        verify = await vcHelper.verifyVC(vc.toJsonTree());
        assert.equal(verify, true);
    });

    it('Test verifySchema', async function () {
        let vc = await vcHelper.createVC(did, privateKey, data);

        let verify = await vcHelper.verifySchema(vc);
        assert.deepEqual(verify, { ok: true });

        verify = await vcHelper.verifySchema(vc.toJsonTree());
        assert.deepEqual(verify, { ok: true });

        vc = await vcHelper.createVC(did, privateKey, {
            '@context': ['https://localhost/schema'],
            'type': 'Test',
            'field1': 'field1'
        });

        verify = await vcHelper.verifySchema(vc);
        assert.deepEqual(verify, {
            "ok": false,
            "error": {
                "details": [
                    {
                        "instancePath": "/credentialSubject",
                        "keyword": "type",
                        "message": "must be object",
                        "params": {
                            "type": "object",
                        },
                        "schemaPath": "#Test/type"
                    },
                    {
                        "instancePath": "/credentialSubject/0",
                        "keyword": "required",
                        "message": "must have required property 'field2'",
                        "params": {
                            "missingProperty": "field2"
                        },
                        "schemaPath": "#Test/required"
                    },
                    {
                        "instancePath": "/credentialSubject",
                        "keyword": "oneOf",
                        "message": "must match exactly one schema in oneOf",
                        "params": {
                            "passingSchemas": null
                        },
                        "schemaPath": "#/properties/credentialSubject/oneOf"
                    },
                ],
                "type": "JSON_SCHEMA_VALIDATION_ERROR"
            }
        });
    });
});