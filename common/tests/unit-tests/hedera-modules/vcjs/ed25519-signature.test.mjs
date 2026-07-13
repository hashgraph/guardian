/**
 * Ed25519Signature2018 verification tests for the @digitalbazaar stack.
 *
 * Guards the @transmute -> @digitalbazaar migration: the digitalbazaar suite is
 * stricter about the verification-method context than @transmute was, so these
 * tests assert that credentials signed by the previous stack still verify, that
 * a tampered proof is rejected, and that the new stack round-trips its own output.
 *
 * The legacy credential fixture in tests/fixtures/credentials was generated with
 * the previous @transmute stack (fixed key) before it was removed; the remaining
 * fixtures are shared inputs reused by the new-stack round-trip test.
 */
import { assert } from 'chai';
import '../../../../dist/index.js'; // warm the module graph (avoids the barrel init cycle when run in isolation)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrivateKey } from '@hiero-ledger/sdk';
import { SignatureType } from '@guardian/interfaces';
import { VCJS } from '../../../../dist/hedera-modules/vcjs/vcjs.js';
import { DefaultDocumentLoader } from '../../../../dist/hedera-modules/document-loader/document-loader-default.js';
import { HederaDidDocument } from '../../../../dist/hedera-modules/vcjs/did/hedera-did-document.js';
import { LocalSchemaContextLoader } from '../../../../dist/document-loader/local-schema-context-loader.js';
import { LocalDidLoader } from '../../../../dist/document-loader/local-did-loader.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/credentials');
const read = (file) => JSON.parse(readFileSync(join(fixtures, file), 'utf8'));

describe('VCJS Ed25519 signing and verification (@digitalbazaar)', function () {
    const oracleVc = read('ed25519-vc.json');
    const oracleDid = read('did-document.json');
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

    function buildVcjs(didDocument) {
        const vcjs = new VCJS();
        vcjs.addDocumentLoader(new DefaultDocumentLoader());
        vcjs.addDocumentLoader(new SchemaContextLoader());
        vcjs.addDocumentLoader(new StaticDidLoader(didDocument));
        vcjs.buildDocumentLoader();
        return vcjs;
    }

    it('verifies a credential signed by the previous (@transmute) Ed25519 stack', async function () {
        const vcjs = buildVcjs(oracleDid);
        const verified = await vcjs.verifyVC(oracleVc);
        assert.isTrue(verified);
    });

    it('rejects a credential whose proof was tampered with', async function () {
        const vcjs = buildVcjs(oracleDid);
        const tampered = JSON.parse(JSON.stringify(oracleVc));
        tampered.proof.jws = tampered.proof.jws.slice(0, -4) + 'AAAA';
        let failed = false;
        try {
            failed = (await vcjs.verifyVC(tampered)) === false;
        } catch (error) {
            failed = true;
        }
        assert.isTrue(failed, 'tampered credential must not verify');
    });

    it('signs and verifies an Ed25519 credential round-trip', async function () {
        const key = PrivateKey.fromString(
            '302e020100300506032b657004220420bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
        );
        const didDocument = await HederaDidDocument.generate('testnet', key, '0.0.0');
        const vcjs = buildVcjs(didDocument.toJsonTree());

        const credential = await vcjs.createVerifiableCredential(
            subject,
            didDocument,
            SignatureType.Ed25519Signature2018
        );
        const json = credential.toJsonTree();
        assert.equal(json.proof.type, SignatureType.Ed25519Signature2018);
        assert.isTrue(await vcjs.verifyVC(json));
    });
});
