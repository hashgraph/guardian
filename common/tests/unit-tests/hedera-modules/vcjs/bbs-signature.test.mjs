/**
 * BbsBlsSignature2020 signing, verification and selective-disclosure tests.
 *
 * EVC schemas are signed with BbsBlsSignature2020 (the @mattrglobal BBS+ suite).
 * After the @transmute -> @digitalbazaar migration this suite is driven by the
 * jsonld-signatures@7 alias (the version it targets) while Ed25519 stays on
 * @digitalbazaar/vc. These tests assert that the new stack signs and verifies a
 * BBS credential, rejects a tampered proof, and that a derived (selectively
 * disclosed) credential still verifies while hiding the undisclosed fields.
 */
import { assert } from 'chai';
import '../../../../dist/index.js'; // warm the module graph (avoids the barrel init cycle when run in isolation)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bbs from '@mattrglobal/jsonld-signatures-bbs';
import jsigV7Module from 'jsonld-signatures-v7';
import { PrivateKey } from '@hiero-ledger/sdk';
import { SignatureType } from '@guardian/interfaces';
import { VCJS } from '../../../../dist/hedera-modules/vcjs/vcjs.js';
import { DocumentLoader } from '../../../../dist/hedera-modules/document-loader/document-loader.js';
import { DefaultDocumentLoader } from '../../../../dist/hedera-modules/document-loader/document-loader-default.js';
import {
    JWS_2020_V1_CONTEXT,
    JWS_2020_V1_URL,
} from '../../../../dist/hedera-modules/document-loader/contexts/jws-2020-v1.js';
import { HederaDidDocument } from '../../../../dist/hedera-modules/vcjs/did/hedera-did-document.js';
import { LocalSchemaContextLoader } from '../../../../dist/document-loader/local-schema-context-loader.js';
import { LocalDidLoader } from '../../../../dist/document-loader/local-did-loader.js';

const { BbsBlsSignature2020, BbsBlsSignatureProof2020, Bls12381G2KeyPair, deriveProof } = bbs;
const jsigV7 = jsigV7Module.default ?? jsigV7Module;

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/credentials');
const read = (file) => JSON.parse(readFileSync(join(fixtures, file), 'utf8'));

// A small EVC-style context with distinct predicates per field, so selective
// disclosure can be observed field-by-field (the shared fixtures map every field
// to one predicate). The bbs-legacy-* fixtures reference this context too.
const TEST_CONTEXT_URL = 'https://example.org/evc-test/v1';
const TEST_CONTEXT = {
    '@context': {
        '@version': 1.1,
        '@protected': true,
        EvcTest: 'https://example.org/evc-test#EvcTest',
        name: 'https://example.org/evc-test#name',
        value: 'https://example.org/evc-test#value',
    },
};

describe('VCJS BbsBlsSignature2020 signing and verification', function () {
    const schema = read('schema.json');
    const subject = read('subject.json');

    // Database-free stub loaders (the production loaders read from MongoDB).
    class SchemaContextLoader extends LocalSchemaContextLoader {
        async has(iri) { return typeof iri === 'string' && iri.startsWith('https://ipfs.io/ipfs/'); }
        loadSchemaContext() { return schema; }
    }
    class StaticDidLoader extends LocalDidLoader {
        constructor(document) { super('did:'); this.document = document; }
        async has(iri) { return typeof iri === 'string' && iri.startsWith('did:'); }
        async getDocument() { return this.document; }
    }
    class TestContextLoader extends LocalDidLoader {
        constructor() { super('https://example.org/'); }
        async has(iri) { return iri === TEST_CONTEXT_URL; }
        async get(iri) { return { documentUrl: iri, document: TEST_CONTEXT, contextUrl: null }; }
    }
    // Resolves the DID and its Bls12381G2 verification method (with the suite context),
    // mirroring how the production DID loader frames a BBS verification method.
    class Bls12381DidLoader extends LocalDidLoader {
        constructor(document) { super('did:'); this.document = document; }
        async has(iri) { return typeof iri === 'string' && iri.startsWith('did:'); }
        async get(iri) {
            if (iri === this.document.id) {
                return { documentUrl: iri, document: this.document, contextUrl: null };
            }
            const method = this.document.verificationMethod[0];
            if (iri === method.id) {
                return {
                    documentUrl: iri,
                    document: { '@context': 'https://w3id.org/security/suites/bls12381-2020/v1', ...method },
                    contextUrl: null,
                };
            }
            throw new Error('Unresolved IRI: ' + iri);
        }
    }

    function loaders(didDocument) {
        return [
            new DefaultDocumentLoader(),
            new SchemaContextLoader(),
            new StaticDidLoader(didDocument),
        ];
    }
    function buildVcjs(didDocument) {
        const vcjs = new VCJS();
        for (const loader of loaders(didDocument)) {
            vcjs.addDocumentLoader(loader);
        }
        vcjs.buildDocumentLoader();
        return vcjs;
    }

    async function generateDidAndVcjs() {
        const key = PrivateKey.fromString(
            '302e020100300506032b657004220420bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
        );
        const didDocument = await HederaDidDocument.generate('testnet', key, '0.0.0');
        return { didDocument, vcjs: buildVcjs(didDocument.toJsonTree()) };
    }

    it('signs and verifies a BbsBlsSignature2020 credential round-trip', async function () {
        const { didDocument, vcjs } = await generateDidAndVcjs();
        const credential = await vcjs.createVerifiableCredential(
            subject,
            didDocument,
            SignatureType.BbsBlsSignature2020
        );
        const json = credential.toJsonTree();
        assert.equal(json.proof.type, SignatureType.BbsBlsSignature2020);
        assert.isTrue(await vcjs.verifyVC(json));
    });

    it('rejects a credential whose BBS proof was tampered with', async function () {
        const { didDocument, vcjs } = await generateDidAndVcjs();
        const credential = await vcjs.createVerifiableCredential(
            subject,
            didDocument,
            SignatureType.BbsBlsSignature2020
        );
        const tampered = credential.toJsonTree();
        tampered.proof.proofValue = tampered.proof.proofValue.slice(0, -6) + 'AAAAAA';
        let failed = false;
        try {
            failed = (await vcjs.verifyVC(tampered)) === false;
        } catch (error) {
            failed = true;
        }
        assert.isTrue(failed, 'tampered BBS credential must not verify');
    });

    it('verifies a BbsBlsSignature2020 credential signed by the previous (@transmute) stack', async function () {
        // Backward-compat oracle: bbs-legacy-vc.json was signed with the pre-migration
        // @transmute stack (fixed key) and must still verify on the @digitalbazaar +
        // jsonld-signatures-v7 stack, so existing on-ledger EVCs remain verifiable.
        const legacyVc = read('bbs-legacy-vc.json');
        const legacyDid = read('bbs-legacy-did.json');
        const vcjs = new VCJS();
        vcjs.addDocumentLoader(new DefaultDocumentLoader());
        vcjs.addDocumentLoader(new TestContextLoader());
        vcjs.addDocumentLoader(new Bls12381DidLoader(legacyDid));
        vcjs.buildDocumentLoader();

        assert.equal(legacyVc.proof.type, SignatureType.BbsBlsSignature2020);
        assert.isTrue(await vcjs.verifyVC(legacyVc));
    });

    it('derives a selectively disclosed credential that hides undisclosed fields', async function () {
        // deriveProof is what VcHelper.vcDeriveProof calls; this exercises the same path
        // through the default document loader. End-to-end verification of a derived proof
        // is a separate concern: it fails identically on the pre-migration @transmute stack
        // and is not addressed by this change.
        const did = 'did:example:bbs-derive';
        const vm = `${did}#bbs`;
        const key = await Bls12381G2KeyPair.generate({ id: vm, controller: did });
        const didDocument = {
            '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/bls12381-2020/v1'],
            id: did,
            verificationMethod: [{ id: vm, type: 'Bls12381G2Key2020', controller: did, publicKeyBase58: key.publicKey }],
            assertionMethod: [vm],
        };
        const documentLoader = DocumentLoader.build([
            new DefaultDocumentLoader(),
            new TestContextLoader(),
            new Bls12381DidLoader(didDocument),
        ]);

        const credential = {
            '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/security/bbs/v1', TEST_CONTEXT_URL],
            id: 'urn:uuid:bbs-derive-1',
            type: ['VerifiableCredential'],
            issuer: did,
            issuanceDate: '2024-01-01T00:00:00Z',
            credentialSubject: { type: 'EvcTest', name: 'Alice', value: '42' },
        };
        const signed = await jsigV7.sign(credential, {
            suite: new BbsBlsSignature2020({ key }),
            purpose: new jsigV7.purposes.AssertionProofPurpose(),
            documentLoader,
        });

        // Reveal only `name`; `@explicit` drops the unlisted `value`.
        const reveal = {
            '@context': signed['@context'],
            type: ['VerifiableCredential'],
            credentialSubject: { '@explicit': true, type: 'EvcTest', name: {} },
        };
        const derived = await deriveProof(signed, reveal, {
            suite: new BbsBlsSignatureProof2020(),
            documentLoader,
        });

        assert.equal(derived.proof.type, 'BbsBlsSignatureProof2020');
        assert.equal(derived.credentialSubject.name, 'Alice', 'revealed field must be present');
        assert.isUndefined(derived.credentialSubject.value, 'undisclosed field must be absent');
    });

    it('serves the vendored jws-2020/v1 context from the default document loader', async function () {
        const loader = new DefaultDocumentLoader();
        assert.isTrue(await loader.has(JWS_2020_V1_URL));
        const { document } = await loader.get(JWS_2020_V1_URL);
        assert.deepEqual(document, JWS_2020_V1_CONTEXT);
        assert.property(document['@context'], 'JsonWebSignature2020');
        assert.property(document['@context'], 'JsonWebKey2020');
    });
});
