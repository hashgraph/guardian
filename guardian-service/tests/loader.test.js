const { expect, assert } = require('chai');
const { loaderAPI } = require('../dist/api/loader.service');
const { SchemaDocumentLoader } = require('../dist/document-loader/vc-document-loader');
const { DIDDocumentLoader } = require('../dist/document-loader/did-document-loader');
const { SchemaObjectLoader } = require('../dist/document-loader/schema-loader');

const { createChannel, createTable } = require('./helper');

describe('Loader service', function () {
    let service, channel;

    const LOAD_DID_DOCUMENT = 'load-did-document';
    const LOAD_SCHEMA_DOCUMENT = 'load-schema-document';
    const LOAD_SCHEMA = 'load-schema';

    const schema = {
        "uuid": "b613e284-5af3-465e-a9a9-329a706180fc",
        "name": "Installer",
        "entity": "INSTALLER",
        "status": "PUBLISHED",
        "readonly": true,
        "document": "{\"$id\":\"#b613e284-5af3-465e-a9a9-329a706180fc\",\"$comment\":\"{\\\"term\\\": \\\"b613e284-5af3-465e-a9a9-329a706180fc\\\", \\\"@id\\\": \\\"https://localhost/schema#b613e284-5af3-465e-a9a9-329a706180fc\\\"}\",\"title\":\"\",\"description\":\"\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}]},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}]},\"id\":{\"type\":\"string\"},\"policyId\":{\"$comment\":\"{\\\"term\\\": \\\"policyId\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"title\":\"\",\"description\":\"\",\"type\":\"string\"},\"name\":{\"$comment\":\"{\\\"term\\\": \\\"name\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"title\":\"\",\"description\":\"\",\"type\":\"string\"}},\"required\":[\"policyId\",\"name\"],\"additionalProperties\":false}"
    }

    const did = {
        "did": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656",
        "document": {
            "@context": ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/transmute/v1"],
            "id": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656",
            "verificationMethod": [{
                "id": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656#did-root-key",
                "type": "Ed25519VerificationKey2018",
                "controller": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656",
                "publicKeyBase58": "8Sifp7mtsgSATerukg2CfQMX8yrjfyRWicMGPyYSyMTa"
            }],
            "authentication": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656#did-root-key",
            "assertionMethod": ["#did-root-key"]
        },
        "status": "CREATE",
        "createDate": {
            "$date": "2021-12-06T19:40:08.901Z"
        },
        "updateDate": {
            "$date": "2021-12-06T19:40:12.668Z"
        }
    };

    before(async function () {
        channel = createChannel();

        const schemaRepository = createTable();
        schemaRepository.find = async function (id) {
            return [schema];
        }

        const didDocumentRepository = createTable();
        didDocumentRepository.findOne = async function (id) {
            return did;
        }

        const schemaDocumentLoader = new SchemaDocumentLoader('https://localhost/schema', schemaRepository);
        const didDocumentLoader = new DIDDocumentLoader(didDocumentRepository);
        const schemaLoader = new SchemaObjectLoader(schemaRepository);
        service = loaderAPI(channel, didDocumentLoader, schemaDocumentLoader, schemaLoader);
    });

    it('Loader service init', async function () {
        assert.exists(channel.map[LOAD_DID_DOCUMENT]);
        assert.exists(channel.map[LOAD_SCHEMA_DOCUMENT]);
        assert.exists(channel.map[LOAD_SCHEMA]);
    });

    it('Test LOAD_DID_DOCUMENT', async function () {
        let value = await channel.run(LOAD_DID_DOCUMENT, { did: did.did });
        assert.deepEqual(value, did.document);
    });

    it('Test LOAD_SCHEMA_DOCUMENT', async function () {
        let value = await channel.run(LOAD_SCHEMA_DOCUMENT, null);
        assert.deepEqual(value, {
            "@context": {
                "@version": 1.1,
                "@vocab": "https://w3id.org/traceability/#undefinedTerm",
                "id": "@id",
                "type": "@type",
                "b613e284-5af3-465e-a9a9-329a706180fc": {
                    "@id": "https://localhost/schema#b613e284-5af3-465e-a9a9-329a706180fc",
                    "@context": {
                        "policyId": {
                            "@id": "https://www.schema.org/text"
                        },
                        "name": {
                            "@id": "https://www.schema.org/text"
                        }
                    }
                }
            }
        });
    });

    it('Test LOAD_SCHEMA', async function () {
        let value = await channel.run(LOAD_SCHEMA, 'b613e284-5af3-465e-a9a9-329a706180fc');
        assert.deepEqual(value, {
            "type": "object",
            "properties": {
                "@context": {
                    "oneOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "id": {
                    "type": "string"
                },
                "type": {
                    "oneOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "issuer": {
                    "oneOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "type": "string"
                                }
                            }
                        }
                    ]
                },
                "issuanceDate": {
                    "type": "string"
                },
                "credentialSubject": {
                    "oneOf": [
                        {
                            "$ref": "#b613e284-5af3-465e-a9a9-329a706180fc"
                        },
                        {
                            "type": "array",
                            "items": {
                                "$ref": "#b613e284-5af3-465e-a9a9-329a706180fc"
                            }
                        }
                    ]
                },
                "proof": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "oneOf": [
                                {
                                    "type": "string"
                                },
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    }
                                }
                            ]
                        },
                        "created": {
                            "type": "string"
                        },
                        "proofPurpose": {
                            "type": "string"
                        },
                        "verificationMethod": {
                            "type": "string"
                        },
                        "jws": {
                            "type": "string"
                        }
                    },
                    "additionalProperties": false
                }
            },
            "required": [
                "@context"
            ],
            "additionalProperties": false,
            "$defs": {
                "#b613e284-5af3-465e-a9a9-329a706180fc": {
                    "$id": "#b613e284-5af3-465e-a9a9-329a706180fc",
                    "$comment": "{\"term\": \"b613e284-5af3-465e-a9a9-329a706180fc\", \"@id\": \"https://localhost/schema#b613e284-5af3-465e-a9a9-329a706180fc\"}",
                    "title": "",
                    "description": "",
                    "type": "object",
                    "properties": {
                        "@context": {
                            "oneOf": [
                                {
                                    "type": "string"
                                },
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    }
                                }
                            ]
                        },
                        "type": {
                            "oneOf": [
                                {
                                    "type": "string"
                                },
                                {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    }
                                }
                            ]
                        },
                        "id": {
                            "type": "string"
                        },
                        "policyId": {
                            "$comment": "{\"term\": \"policyId\", \"@id\": \"https://www.schema.org/text\"}",
                            "title": "",
                            "description": "",
                            "type": "string"
                        },
                        "name": {
                            "$comment": "{\"term\": \"name\", \"@id\": \"https://www.schema.org/text\"}",
                            "title": "",
                            "description": "",
                            "type": "string"
                        }
                    },
                    "required": [
                        "policyId",
                        "name"
                    ],
                    "additionalProperties": false
                }
            }
        });
    });
});