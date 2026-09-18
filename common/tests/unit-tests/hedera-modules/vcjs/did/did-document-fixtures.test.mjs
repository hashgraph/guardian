import { assert } from 'chai';

import { CommonDidDocument } from '../../../../../dist/hedera-modules/vcjs/did/common-did-document.js';
import { HederaDidDocument } from '../../../../../dist/hedera-modules/vcjs/did/hedera-did-document.js';
import { VerificationMethod } from '../../../../../dist/hedera-modules/vcjs/did/components/verification-method.js';
import { HederaDid } from '../../../../../dist/hedera-modules/vcjs/did/hedera-did.js';

import { did_document } from '../../../dump/did_document.mjs';

function docTree(index) {
    return JSON.parse(JSON.stringify(did_document[index].document));
}

describe('CommonDidDocument with DID fixtures', function () {
    for (let i = 0; i < did_document.length; i++) {
        const raw = did_document[i].document;

        it(`fixture ${i}: from(object) preserves the id`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.equal(doc.getDid(), raw.id);
        });

        it(`fixture ${i}: from(string) preserves the id`, function () {
            const doc = CommonDidDocument.from(JSON.stringify(docTree(i)));
            assert.equal(doc.getDid(), raw.id);
        });

        it(`fixture ${i}: getDocument id matches`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.equal(doc.getDocument().id, raw.id);
        });

        it(`fixture ${i}: getDocument @context matches`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.deepEqual(doc.getDocument()['@context'], raw['@context']);
        });

        it(`fixture ${i}: exposes one verification method`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            const methods = doc.getVerificationMethods();
            assert.lengthOf(methods, raw.verificationMethod.length);
            assert.instanceOf(methods[0], VerificationMethod);
        });

        it(`fixture ${i}: verification method round-trips fields`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            const vmObj = doc.getDocument().verificationMethod[0];
            assert.deepEqual(vmObj, raw.verificationMethod[0]);
        });

        it(`fixture ${i}: getMethodByName finds the root key`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            const id = raw.verificationMethod[0].id;
            assert.equal(doc.getMethodByName(id).getId(), id);
        });

        it(`fixture ${i}: getMethodByName returns null for unknown id`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.isNull(doc.getMethodByName('did:hedera:testnet:none#x'));
        });

        it(`fixture ${i}: getMethodByType finds Ed25519 method`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            const t = raw.verificationMethod[0].type;
            assert.equal(doc.getMethodByType(t).getType(), t);
        });

        it(`fixture ${i}: getMethodByType returns null for unknown type`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.isNull(doc.getMethodByType('NoSuchKeyType'));
        });

        it(`fixture ${i}: assertionMethod link is preserved as string`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            const am = doc.getDocument().assertionMethod;
            assert.deepEqual(am, raw.assertionMethod);
        });

        it(`fixture ${i}: getPrivateKeys is empty (no private material)`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.lengthOf(doc.getPrivateKeys(), 0);
        });

        it(`fixture ${i}: toCredentialHash is deterministic base58`, function () {
            const a = CommonDidDocument.from(docTree(i)).toCredentialHash();
            const b = CommonDidDocument.from(docTree(i)).toCredentialHash();
            assert.isString(a);
            assert.equal(a, b);
            assert.match(a, /^[1-9A-HJ-NP-Za-km-z]+$/);
        });

        it(`fixture ${i}: compare with itself returns true`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.isTrue(doc.compare(doc));
        });

        it(`fixture ${i}: compare with its own JSON returns true`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            assert.isTrue(doc.compare(JSON.stringify(doc.getDocument())));
        });

        it(`fixture ${i}: compare with a different fixture returns false`, function () {
            const a = CommonDidDocument.from(docTree(i));
            const other = CommonDidDocument.from(docTree((i + 1) % did_document.length));
            assert.isFalse(a.compare(other));
        });

        it(`fixture ${i}: setPrivateKey then getPrivateKeys exposes it`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            const id = raw.verificationMethod[0].id;
            doc.setPrivateKey(id, 'fakePrivateKey58');
            const keys = doc.getPrivateKeys();
            assert.lengthOf(keys, 1);
            assert.equal(keys[0].id, id);
            assert.equal(keys[0].key, 'fakePrivateKey58');
        });

        it(`fixture ${i}: getPrivateDocument includes private key after set`, function () {
            const doc = CommonDidDocument.from(docTree(i));
            const id = raw.verificationMethod[0].id;
            doc.setPrivateKey(id, 'fakePrivateKey58');
            const pub = doc.getDocument();
            assert.notProperty(pub.verificationMethod[0], 'privateKeyBase58');
            const priv = doc.getPrivateDocument();
            assert.equal(priv.verificationMethod[0].privateKeyBase58, 'fakePrivateKey58');
        });
    }

    it('from throws on invalid (number) document', function () {
        assert.throws(() => CommonDidDocument.from(42), /Invalid document format/);
    });

    it('compare returns false for malformed JSON', function () {
        const doc = CommonDidDocument.from(docTree(0));
        assert.isFalse(doc.compare('{not-json'));
    });

    it('compare returns false when ids differ', function () {
        const doc = CommonDidDocument.from(docTree(0));
        const other = docTree(0);
        other.id = 'did:hedera:testnet:different_0.0.1';
        assert.isFalse(doc.compare(other));
    });

    it('static DID context constants', function () {
        assert.equal(CommonDidDocument.DID_DOCUMENT_CONTEXT, 'https://www.w3.org/ns/did/v1');
        assert.equal(CommonDidDocument.DID_DOCUMENT_TRANSMUTE_CONTEXT, 'https://ns.did.ai/transmute/v1');
    });
});

describe('HederaDidDocument with DID fixtures', function () {
    for (let i = 0; i < did_document.length; i++) {
        const raw = did_document[i].document;

        it(`fixture ${i}: from(string) parses correctly`, function () {
            const doc = HederaDidDocument.from(JSON.stringify(docTree(i)));
            assert.equal(doc.getDid(), raw.id);
        });

        it(`fixture ${i}: fromJsonTree equals toJsonTree round-trip on id`, function () {
            const doc = HederaDidDocument.fromJsonTree(docTree(i));
            assert.equal(doc.toJsonTree().id, raw.id);
        });

        it(`fixture ${i}: did resolves to a HederaDid`, function () {
            const doc = HederaDidDocument.from(docTree(i));
            const did = HederaDid.from(doc.getDid());
            assert.equal(did.getMethod(), 'hedera');
        });

        it(`fixture ${i}: setDidTopicId accepts a string`, function () {
            const doc = HederaDidDocument.from(docTree(i));
            doc.setDidTopicId('0.0.999');
            assert.equal(doc.getDidTopicId().toString(), '0.0.999');
        });
    }

    it('from throws on invalid input', function () {
        assert.throws(() => HederaDidDocument.from(123), /Invalid document format/);
    });
});
