const { expect, assert } = require('chai');

const {
    VCJS
} = require('../../../../dist/hedera-modules/vcjs/vcjs');
const {
    DefaultDocumentLoader
} = require('../../../../dist/hedera-modules/document-loader/document-loader-default');
const {
    ContextDocumentLoader
} = require('../../../../dist/document-loader/context-loader');
const {
    DIDDocumentLoader
} = require('../../../../dist/document-loader/did-document-loader');
const {
    VCSchemaLoader
} = require('../../../../dist/document-loader/vc-schema-loader');
const {
    SubjectSchemaLoader
} = require('../../../../dist/document-loader/subject-schema-loader');
const {
    DIDDocument
} = require('../../../../dist/hedera-modules/vcjs/did-document');
const { PrivateKey } = require("@hashgraph/sdk");

const { vc_document } = require('../../dump/vc_document');


describe('VCJS', function () {
    const actualVcDocument = vc_document.find(document => document.hash === '9s7b1eW2gkZEd64SAidCci3UmXQgfZt2w6ajiKdPdHa9');
    const vcValueToCreate = actualVcDocument.document.credentialSubject[0];
    const newPrivateKey = PrivateKey.generate();
    const schema = {
        "_id": {
            "$oid": "625e95e75714cda4463d8aaa"
        },
        "uuid": "MintToken",
        "hash": "",
        "name": "MintToken",
        "entity": "MINT_TOKEN",
        "status": "PUBLISHED",
        "readonly": true,
        "document": {
            "$id": "#MintToken&1.0.0",
            "$comment": "{ \"term\": \"MintToken&1.0.0\", \"@id\": \"undefined#MintToken&1.0.0\" }",
            "title": "MintToken",
            "description": "MintToken",
            "type": "object",
            "properties": {
                "@context": {
                    "oneOf": [{
                        "type": "string"
                    }, {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }],
                    "readOnly": true
                },
                "type": {
                    "oneOf": [{
                        "type": "string"
                    }, {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }],
                    "readOnly": true
                },
                "id": {
                    "type": "string",
                    "readOnly": true
                },
                "date": {
                    "$comment": "{\"term\": \"date\", \"@id\": \"https://www.schema.org/text\"}",
                    "title": "date",
                    "description": "date",
                    "type": "string",
                    "readOnly": false
                },
                "amount": {
                    "$comment": "{\"term\": \"amount\", \"@id\": \"https://www.schema.org/text\"}",
                    "title": "amount",
                    "description": "amount",
                    "type": "string",
                    "readOnly": false
                },
                "tokenId": {
                    "$comment": "{\"term\": \"tokenId\", \"@id\": \"https://www.schema.org/text\"}",
                    "title": "tokenId",
                    "description": "tokenId",
                    "type": "string",
                    "readOnly": false
                }
            },
            "required": ["date", "amount", "tokenId"],
            "additionalProperties": false
        },
        "context": {
            "@context": {
                "@version": 1.1,
                "@vocab": "https://w3id.org/traceability/#undefinedTerm",
                "id": "@id",
                "type": "@type",
                "MintToken&1.0.0": {
                    "@id": "undefined#MintToken&1.0.0",
                    "@context": {
                        "date": {
                            "@id": "https://www.schema.org/text"
                        },
                        "amount": {
                            "@id": "https://www.schema.org/text"
                        },
                        "tokenId": {
                            "@id": "https://www.schema.org/text"
                        }
                    }
                }
            }
        },
        "version": "1.0.0",
        "creator": null,
        "owner": null,
        "topicId": "0.0.29614911",
        "messageId": "1648050464.170190891",
        "documentURL": "https://ipfs.io/ipfs/bafkreiflfkyh4fhft7yyrq7g7rnvqwac3mengo555vlz72qtsnqmhcy77q",
        "contextURL": "https://ipfs.io/ipfs/bafkreiaamzhmh3l5pn5nneib5yifb3gjwlotf6fr6vb65j7tfi4tefxcza",
        "iri": "#MintToken&1.0.0",
        "createDate": {
            "$date": "2022-04-19T10:58:47.545Z"
        }
    }

    class TestVCSchemaLoader extends VCSchemaLoader {
        loadSchemaContexts(context) {
            return typeof context == 'string' ? schema : [schema];
        }
    }

    class TestContextDocumentLoader extends ContextDocumentLoader {
        loadSchemaContext(context) {
            return schema;
        }
    }

    class TestSubjectSchemaLoader extends SubjectSchemaLoader {
        loadSchemaContexts(context) {
            return typeof context == 'string' ? schema : [schema];
        }
    }

    class TestDIDDocumentLoader extends DIDDocumentLoader {
        getDocument(iri) {
            return {
                    "@context": ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/transmute/v1"],
                    "id": "did:hedera:testnet:L8wzF8StAHSQ2yza6RPpCKWFUSXg5CyXZCb4QZtGtWq;hedera:testnet:tid=0.0.34235373",
                    "verificationMethod": [{
                        "id": "did:hedera:testnet:L8wzF8StAHSQ2yza6RPpCKWFUSXg5CyXZCb4QZtGtWq;hedera:testnet:tid=0.0.34235373#did-root-key",
                        "type": "Ed25519VerificationKey2018",
                        "controller": "did:hedera:testnet:L8wzF8StAHSQ2yza6RPpCKWFUSXg5CyXZCb4QZtGtWq;hedera:testnet:tid=0.0.34235373",
                        "publicKeyBase58": "7KtohV6cu3ZDXZnbc3QyPXYYHJUXJg5PoE9T7V4cV7wd"
                    }],
                    "authentication": "did:hedera:testnet:L8wzF8StAHSQ2yza6RPpCKWFUSXg5CyXZCb4QZtGtWq;hedera:testnet:tid=0.0.34235373#did-root-key",
                    "assertionMethod": ["#did-root-key"]
                }
        }
    }

    class TestDefaultDocumentLoader extends DefaultDocumentLoader {
        has(iri) {
            return iri === 'https://www.w3.org/2018/credentials/v1'
                || iri === 'https://www.w3.org/ns/did/v1'
                || iri === 'https://ns.did.ai/transmute/v1'
        }
        get(iri) {
            const credentials = {
                documentUrl: iri,
                document: {
                    "@context": {
                    "@version": 1.1,
                    "@protected": true,

                    "id": "@id",
                    "type": "@type",

                    "VerifiableCredential": {
                        "@id": "https://www.w3.org/2018/credentials#VerifiableCredential",
                        "@context": {
                        "@version": 1.1,
                        "@protected": true,

                        "id": "@id",
                        "type": "@type",

                        "cred": "https://www.w3.org/2018/credentials#",
                        "sec": "https://w3id.org/security#",
                        "xsd": "http://www.w3.org/2001/XMLSchema#",

                        "credentialSchema": {
                            "@id": "cred:credentialSchema",
                            "@type": "@id",
                            "@context": {
                            "@version": 1.1,
                            "@protected": true,

                            "id": "@id",
                            "type": "@type",

                            "cred": "https://www.w3.org/2018/credentials#",

                            "JsonSchemaValidator2018": "cred:JsonSchemaValidator2018"
                            }
                        },
                        "credentialStatus": {"@id": "cred:credentialStatus", "@type": "@id"},
                        "credentialSubject": {"@id": "cred:credentialSubject", "@type": "@id"},
                        "evidence": {"@id": "cred:evidence", "@type": "@id"},
                        "expirationDate": {"@id": "cred:expirationDate", "@type": "xsd:dateTime"},
                        "holder": {"@id": "cred:holder", "@type": "@id"},
                        "issued": {"@id": "cred:issued", "@type": "xsd:dateTime"},
                        "issuer": {"@id": "cred:issuer", "@type": "@id"},
                        "issuanceDate": {"@id": "cred:issuanceDate", "@type": "xsd:dateTime"},
                        "proof": {"@id": "sec:proof", "@type": "@id", "@container": "@graph"},
                        "refreshService": {
                            "@id": "cred:refreshService",
                            "@type": "@id",
                            "@context": {
                            "@version": 1.1,
                            "@protected": true,

                            "id": "@id",
                            "type": "@type",

                            "cred": "https://www.w3.org/2018/credentials#",

                            "ManualRefreshService2018": "cred:ManualRefreshService2018"
                            }
                        },
                        "termsOfUse": {"@id": "cred:termsOfUse", "@type": "@id"},
                        "validFrom": {"@id": "cred:validFrom", "@type": "xsd:dateTime"},
                        "validUntil": {"@id": "cred:validUntil", "@type": "xsd:dateTime"}
                        }
                    },

                    "VerifiablePresentation": {
                        "@id": "https://www.w3.org/2018/credentials#VerifiablePresentation",
                        "@context": {
                        "@version": 1.1,
                        "@protected": true,

                        "id": "@id",
                        "type": "@type",

                        "cred": "https://www.w3.org/2018/credentials#",
                        "sec": "https://w3id.org/security#",

                        "holder": {"@id": "cred:holder", "@type": "@id"},
                        "proof": {"@id": "sec:proof", "@type": "@id", "@container": "@graph"},
                        "verifiableCredential": {"@id": "cred:verifiableCredential", "@type": "@id", "@container": "@graph"}
                        }
                    },

                    "EcdsaSecp256k1Signature2019": {
                        "@id": "https://w3id.org/security#EcdsaSecp256k1Signature2019",
                        "@context": {
                        "@version": 1.1,
                        "@protected": true,

                        "id": "@id",
                        "type": "@type",

                        "sec": "https://w3id.org/security#",
                        "xsd": "http://www.w3.org/2001/XMLSchema#",

                        "challenge": "sec:challenge",
                        "created": {"@id": "http://purl.org/dc/terms/created", "@type": "xsd:dateTime"},
                        "domain": "sec:domain",
                        "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
                        "jws": "sec:jws",
                        "nonce": "sec:nonce",
                        "proofPurpose": {
                            "@id": "sec:proofPurpose",
                            "@type": "@vocab",
                            "@context": {
                            "@version": 1.1,
                            "@protected": true,

                            "id": "@id",
                            "type": "@type",

                            "sec": "https://w3id.org/security#",

                            "assertionMethod": {"@id": "sec:assertionMethod", "@type": "@id", "@container": "@set"},
                            "authentication": {"@id": "sec:authenticationMethod", "@type": "@id", "@container": "@set"}
                            }
                        },
                        "proofValue": "sec:proofValue",
                        "verificationMethod": {"@id": "sec:verificationMethod", "@type": "@id"}
                        }
                    },

                    "EcdsaSecp256r1Signature2019": {
                        "@id": "https://w3id.org/security#EcdsaSecp256r1Signature2019",
                        "@context": {
                        "@version": 1.1,
                        "@protected": true,

                        "id": "@id",
                        "type": "@type",

                        "sec": "https://w3id.org/security#",
                        "xsd": "http://www.w3.org/2001/XMLSchema#",

                        "challenge": "sec:challenge",
                        "created": {"@id": "http://purl.org/dc/terms/created", "@type": "xsd:dateTime"},
                        "domain": "sec:domain",
                        "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
                        "jws": "sec:jws",
                        "nonce": "sec:nonce",
                        "proofPurpose": {
                            "@id": "sec:proofPurpose",
                            "@type": "@vocab",
                            "@context": {
                            "@version": 1.1,
                            "@protected": true,

                            "id": "@id",
                            "type": "@type",

                            "sec": "https://w3id.org/security#",

                            "assertionMethod": {"@id": "sec:assertionMethod", "@type": "@id", "@container": "@set"},
                            "authentication": {"@id": "sec:authenticationMethod", "@type": "@id", "@container": "@set"}
                            }
                        },
                        "proofValue": "sec:proofValue",
                        "verificationMethod": {"@id": "sec:verificationMethod", "@type": "@id"}
                        }
                    },

                    "Ed25519Signature2018": {
                        "@id": "https://w3id.org/security#Ed25519Signature2018",
                        "@context": {
                        "@version": 1.1,
                        "@protected": true,

                        "id": "@id",
                        "type": "@type",

                        "sec": "https://w3id.org/security#",
                        "xsd": "http://www.w3.org/2001/XMLSchema#",

                        "challenge": "sec:challenge",
                        "created": {"@id": "http://purl.org/dc/terms/created", "@type": "xsd:dateTime"},
                        "domain": "sec:domain",
                        "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
                        "jws": "sec:jws",
                        "nonce": "sec:nonce",
                        "proofPurpose": {
                            "@id": "sec:proofPurpose",
                            "@type": "@vocab",
                            "@context": {
                            "@version": 1.1,
                            "@protected": true,

                            "id": "@id",
                            "type": "@type",

                            "sec": "https://w3id.org/security#",

                            "assertionMethod": {"@id": "sec:assertionMethod", "@type": "@id", "@container": "@set"},
                            "authentication": {"@id": "sec:authenticationMethod", "@type": "@id", "@container": "@set"}
                            }
                        },
                        "proofValue": "sec:proofValue",
                        "verificationMethod": {"@id": "sec:verificationMethod", "@type": "@id"}
                        }
                    },

                    "RsaSignature2018": {
                        "@id": "https://w3id.org/security#RsaSignature2018",
                        "@context": {
                        "@version": 1.1,
                        "@protected": true,

                        "challenge": "sec:challenge",
                        "created": {"@id": "http://purl.org/dc/terms/created", "@type": "xsd:dateTime"},
                        "domain": "sec:domain",
                        "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
                        "jws": "sec:jws",
                        "nonce": "sec:nonce",
                        "proofPurpose": {
                            "@id": "sec:proofPurpose",
                            "@type": "@vocab",
                            "@context": {
                            "@version": 1.1,
                            "@protected": true,

                            "id": "@id",
                            "type": "@type",

                            "sec": "https://w3id.org/security#",

                            "assertionMethod": {"@id": "sec:assertionMethod", "@type": "@id", "@container": "@set"},
                            "authentication": {"@id": "sec:authenticationMethod", "@type": "@id", "@container": "@set"}
                            }
                        },
                        "proofValue": "sec:proofValue",
                        "verificationMethod": {"@id": "sec:verificationMethod", "@type": "@id"}
                        }
                    },

                    "proof": {"@id": "https://w3id.org/security#proof", "@type": "@id", "@container": "@graph"}
                    }
                }
            }

            const did = {
                documentUrl: iri,
                document: {
                    "@context": {
                      "@protected": true,
                      "id": "@id",
                      "type": "@type",

                      "alsoKnownAs": {
                        "@id": "https://www.w3.org/ns/activitystreams#alsoKnownAs",
                        "@type": "@id"
                      },
                      "assertionMethod": {
                        "@id": "https://w3id.org/security#assertionMethod",
                        "@type": "@id",
                        "@container": "@set"
                      },
                      "authentication": {
                        "@id": "https://w3id.org/security#authenticationMethod",
                        "@type": "@id",
                        "@container": "@set"
                      },
                      "capabilityDelegation": {
                        "@id": "https://w3id.org/security#capabilityDelegationMethod",
                        "@type": "@id",
                        "@container": "@set"
                      },
                      "capabilityInvocation": {
                        "@id": "https://w3id.org/security#capabilityInvocationMethod",
                        "@type": "@id",
                        "@container": "@set"
                      },
                      "controller": {
                        "@id": "https://w3id.org/security#controller",
                        "@type": "@id"
                      },
                      "keyAgreement": {
                        "@id": "https://w3id.org/security#keyAgreementMethod",
                        "@type": "@id",
                        "@container": "@set"
                      },
                      "service": {
                        "@id": "https://www.w3.org/ns/did#service",
                        "@type": "@id",
                        "@context": {
                          "@protected": true,
                          "id": "@id",
                          "type": "@type",
                          "serviceEndpoint": {
                            "@id": "https://www.w3.org/ns/did#serviceEndpoint",
                            "@type": "@id"
                          }
                        }
                      },
                      "verificationMethod": {
                        "@id": "https://w3id.org/security#verificationMethod",
                        "@type": "@id"
                      }
                    }
                  }
            }

            const transmute = {
                documentUrl: iri,
                document: {
                    "@context": [
                      {
                        "@version": 1.1
                      },
                      "https://www.w3.org/ns/did/v1",
                      {
                        "JsonWebKey2020": "https://w3id.org/security#JsonWebKey2020",
                        "Ed25519VerificationKey2018": "https://w3id.org/security#Ed25519VerificationKey2018",
                        "X25519KeyAgreementKey2019": "https://w3id.org/security#X25519KeyAgreementKey2019",

                        "publicKeyJwk": {
                          "@id": "https://w3id.org/security#publicKeyJwk",
                          "@type": "@json"
                        },
                        "publicKeyBase58": {
                          "@id": "https://w3id.org/security#publicKeyBase58"
                        }
                      }
                    ]
                  }
            }

            switch(iri) {
                case 'https://www.w3.org/2018/credentials/v1':
                    return credentials;
                case 'https://www.w3.org/ns/did/v1':
                    return did;
                case 'https://ns.did.ai/transmute/v1':
                    return transmute;
            }
        }
    }

    it('Test VCJS', async function () {
        const vcjs = new VCJS();
        assert.exists(vcjs);

        const defaultDocumentLoader = new TestDefaultDocumentLoader();
        const schemaDocumentLoader = new TestContextDocumentLoader('https://ipfs.io/ipfs/');
        const didDocumentLoader = new TestDIDDocumentLoader();
        const vcSchemaObjectLoader = new TestVCSchemaLoader("https://ipfs.io/ipfs/");
        const subjectSchemaObjectLoader = new TestSubjectSchemaLoader("https://ipfs.io/ipfs/");

        vcjs.addDocumentLoader(defaultDocumentLoader);
        vcjs.addDocumentLoader(schemaDocumentLoader);
        vcjs.addDocumentLoader(didDocumentLoader);
        vcjs.addSchemaLoader(vcSchemaObjectLoader);
        vcjs.addSchemaLoader(subjectSchemaObjectLoader);
        vcjs.buildDocumentLoader();
        vcjs.buildSchemaLoader();

        // assert.isTrue((await vcjs.verifyVC(actualVcDocument.document)));
        // assert.isTrue((await vcjs.verifySchema(actualVcDocument.document)).ok);
        // assert.isTrue((await vcjs.verifySubject(actualVcDocument.document.credentialSubject[0])).ok);

        const createdDidDocument = await DIDDocument.create(newPrivateKey);

        const testVc = await vcjs.createVC(
            createdDidDocument.getDid(),
            createdDidDocument.getPrivateKey(),
            vcValueToCreate
        )
        assert.exists(testVc);
        // assert.isTrue(await vcjs.verifyVC(actualVcDocument.document));
        //
        const testVp = await vcjs.createVP(
            createdDidDocument.getDid(),
            createdDidDocument.getPrivateKey(),
            [testVc]
        );
        assert.exists(testVp);
    });
});