const {
    HcsVcDocument, VcSubject, HcsVpDocument
} = require("../../../dist/index");
const {
    VCJS
} = require("../../../dist/vc/vcjs");

const { PrivateKey } = require("@hashgraph/sdk");
const { expect, assert } = require('chai');

const didContexts = require("@transmute/did-context").contexts;
const credentialsContexts = require("@transmute/credentials-context").contexts;
const securityContexts = require("@transmute/security-context").contexts;

describe("HcsVpDocument", function () {
    let didId, didRootId, privateKeyString, privateKey, loader, data;

    before(async function () {
        didRootId = "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001#did-root-key";
        didId = "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001";
        privateKeyString = "302e020100300506032b6570042204203e33c2cdb749c95c121ce151a39ecb4a1cf6b1241c3e8e20edc3df06f7275509";
        privateKey = PrivateKey.fromString(privateKeyString);
        loader = function (iri) {
            if ((didContexts).has(iri)) {
                return {
                    documentUrl: iri,
                    document: didContexts.get(iri),
                };
            }
            if ((credentialsContexts).has(iri)) {
                return {
                    documentUrl: iri,
                    document: credentialsContexts.get(iri),
                };
            }
            if ((securityContexts).has(iri)) {
                return {
                    documentUrl: iri,
                    document: securityContexts.get(iri),
                };
            }
            if (iri.startsWith("https://localhost/schema")) {
                return {
                    documentUrl: iri,
                    document: {
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
                    },
                };
            }
            if (iri.startsWith("did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001")) {
                return {
                    documentUrl: iri,
                    document: {
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
                }
            }
            throw new Error("IRI not found");
        }
        data = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "id": "f5630d9a-3c27-4ccc-a371-f4d30c2da4e1",
            "type": ["VerifiableCredential", "Test"],
            "credentialSubject": [{
                "@context": ["https://localhost/schema"],
                "type": "Test",
                "field1": "field1",
                "field2": "field2"
            }],
            "issuer": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
            "issuanceDate": "2021-10-13T11:21:47.894Z"
        }
    });

    it('Test createSuite', async function () {
        const suite = await VCJS.createSuite(didRootId, didId, privateKey);
        assert.exists(suite);
    });

    it('Test issue and verify', async function () {
        const suite = await VCJS.createSuite(didRootId, didId, privateKey);

        let doc = HcsVcDocument.fromJsonTree(data, null, VcSubject);
        doc.setIssuer(didId);
        doc = await VCJS.issue(doc, suite, loader);

        assert.exists(doc.getProof());

        let verify = await VCJS.verify(doc.toJsonTree(), loader);
        assert.equal(verify, true);

        doc.credentialSubject[0].fields["field1"] = "";
        verify = await VCJS.verify(doc.toJsonTree(), loader);
        assert.equal(verify, false);

        try {
            doc = HcsVcDocument.fromJsonTree({
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                "id": "f5630d9a-3c27-4ccc-a371-f4d30c2da4e1",
                "type": ["VerifiableCredential", "Test"],
                "credentialSubject": [{
                    "@context": ["https://localhost/schema"],
                    "type": "Test",
                    "field1": "field1",
                    "field3": "field3"
                }],
                "issuer": "did:hedera:testnet:VtgqXgMSanpX3v85ypZbysTKeggMvdEupcz2AbAYPRR;hedera:testnet:fid=0.0.2859001",
                "issuanceDate": "2021-10-13T11:21:47.894Z"
            }, null, VcSubject);
            doc.setIssuer(didId);
            doc = await VCJS.issue(doc, suite, loader);
        } catch (error) {
            doc = null;
        }
        assert.notExists(doc);
    });

    it('Test issuePresentation', async function () {
        const suite = await VCJS.createSuite(didRootId, didId, privateKey);

        let vc = HcsVcDocument.fromJsonTree(data, null, VcSubject);
        vc.setIssuer(didId);
        vc = await VCJS.issue(vc, suite, loader);

        let vp = new HcsVpDocument();
        vp.setId("f5630d9a-3c27-4ccc-a371-f4d30c2da4e1");
        vp.addVerifiableCredential(vc);

        vp = await VCJS.issuePresentation(vp, suite, loader);

        assert.exists(vp.getProof());
    });
});



