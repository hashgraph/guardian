const {
    VCHelper,
    DefaultDocumentLoader,
    VCDocumentLoader,
    DIDDocumentLoader
} = require("../../dist/index");
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
            throw new Error("IRI not found: " + iri);
        };
    }
}

describe("VCHelper", function () {
    let vcHelper, did, privateKey, data;

    before(async function () {
        vcHelper = new VCHelper();
        did = "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001";
        privateKey = "302e020100300506032b6570042204203e33c2cdb749c95c121ce151a39ecb4a1cf6b1241c3e8e20edc3df06f7275509";
        data = {
            "@context": ["https://localhost/schema"],
            "type": "Test",
            "field1": "field1",
            "field2": "field2"
        }
    });

    it('Test DocumentLoaderBuild', async function () {
        const context = 'https://localhost/schema';
        const schema = {
            "@context": {
                "@version": 1.1,
                "id": "@id",
                "type": "@type",
                "name": "https://schema.org/name",
                "Test": {
                    "@id": "https://localhost/schema#Test",
                    "@context": {
                        "field1": {
                            "@id": "https://www.schema.org/text"
                        },
                        "field2": {
                            "@id": "https://www.schema.org/text"
                        },
                    }
                },
            }
        }
        const didDoc = {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://ns.did.ai/transmute/v1"
            ],
            "id": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
            "verificationMethod": [
                {
                    "id": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001#did-root-key",
                    "type": "Ed25519VerificationKey2018",
                    "controller": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
                    "publicKeyBase58": "2kDCE2VVVdSQbbu217aa6yg6rTTbv4vvpw1nDyEQHCLu"
                }
            ],
            "authentication": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001#did-root-key",
            "assertionMethod": [
                "#did-root-key"
            ]
        }
        vcHelper.addContext(context);
        vcHelper.addDocumentLoader(new DefaultDocumentLoader());
        vcHelper.addDocumentLoader(new _DocumentLoader(context, schema));
        vcHelper.addDocumentLoader(new _DocumentLoader("did:hedera:", didDoc));
        vcHelper.buildDocumentLoader();
        assert.exists(vcHelper.loader);
    });

    it('Test DocumentLoader', async function () {
        assert.exists(await vcHelper.loader("https://www.w3.org/ns/did/v1"));
        assert.exists(await vcHelper.loader("https://ns.did.ai/transmute/v1"));
        assert.exists(await vcHelper.loader("https://localhost/schema"));
        assert.exists(await vcHelper.loader("did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001"));
        let errorIRI = null;
        try {
            errorIRI = await vcHelper.loader("...");
        } catch (error) {
            errorIRI = null;
        }
        assert.notExists(errorIRI);
    });

    it('Test createCredential', async function () {
        const vc = await vcHelper.createCredential(did, "Test", data);
        assert.exists(vc);
        assert.deepEqual(vc, {
            "@context": [
                "https://www.w3.org/2018/credentials/v1"
            ],
            "id": vc.id,
            "type": [
                "VerifiableCredential",
                "Test"
            ],
            "credentialSubject": [
                {
                    "@context": [
                        "https://localhost/schema"
                    ],
                    "type": "Test",
                    "field1": "field1",
                    "field2": "field2"
                }
            ],
            "issuer": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
            "issuanceDate": vc.issuanceDate
        });
    });

    it('Test issueCredential', async function () {
        const credential = await vcHelper.createCredential(did, "Test", data);
        const vc = await vcHelper.issueCredential(did, privateKey, credential);
        assert.exists(vc);
        assert.exists(vc.getProof());
        const root = vc.toJsonTree();
        assert.deepEqual(root, {
            "@context": [
                "https://www.w3.org/2018/credentials/v1"
            ],
            "id": root.id,
            "type": [
                "VerifiableCredential",
                "Test"
            ],
            "credentialSubject": [
                {
                    "@context": [
                        "https://localhost/schema"
                    ],
                    "type": "Test",
                    "field1": "field1",
                    "field2": "field2"
                }
            ],
            "issuer": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
            "issuanceDate": root.issuanceDate,
            "proof": root.proof
        });
    });

    it('Test createVC', async function () {
        const vc = await vcHelper.createVC(did, privateKey, "Test", data);
        assert.exists(vc);
        assert.exists(vc.getProof());
        const root = vc.toJsonTree();
        assert.deepEqual(root, {
            "@context": [
                "https://www.w3.org/2018/credentials/v1"
            ],
            "id": root.id,
            "type": [
                "VerifiableCredential",
                "Test"
            ],
            "credentialSubject": [
                {
                    "@context": [
                        "https://localhost/schema"
                    ],
                    "type": "Test",
                    "field1": "field1",
                    "field2": "field2"
                }
            ],
            "issuer": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
            "issuanceDate": root.issuanceDate,
            "proof": root.proof
        });
    });

    it('Test createVP', async function () {
        const vc = await vcHelper.createVC(did, privateKey, "Test", data);
        const vp = await vcHelper.createVP(did, privateKey, [vc], "f5630d9a-3c27-4ccc-a371-f4d30c2da4e1");
        assert.exists(vp);
        assert.exists(vp.getProof());

        const rootVC = vc.toJsonTree();
        const root = vp.toJsonTree();

        assert.deepEqual(root, {
            "id": "f5630d9a-3c27-4ccc-a371-f4d30c2da4e1",
            "type": [
                "VerifiablePresentation"
            ],
            "@context": [
                "https://www.w3.org/2018/credentials/v1"
            ],
            "verifiableCredential": [
                {
                    "@context": [
                        "https://www.w3.org/2018/credentials/v1"
                    ],
                    "id": rootVC.id,
                    "type": [
                        "VerifiableCredential",
                        "Test"
                    ],
                    "credentialSubject": [
                        {
                            "@context": [
                                "https://localhost/schema"
                            ],
                            "type": "Test",
                            "field1": "field1",
                            "field2": "field2"
                        }
                    ],
                    "issuer": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
                    "issuanceDate": rootVC.issuanceDate,
                    "proof": rootVC.proof
                }
            ],
            "proof": root.proof
        });
    });

    it('Test verifyVC', async function () {
        const vc = await vcHelper.createVC(did, privateKey, "Test", data);

        let verify = await vcHelper.verifyVC(vc);
        assert.equal(verify, true);

        verify = await vcHelper.verifyVC(vc.toJsonTree());
        assert.equal(verify, true);
    });
});