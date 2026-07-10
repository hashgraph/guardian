import { assert } from 'chai';

import { CommonDidDocument } from '../../../../../dist/hedera-modules/vcjs/did/common-did-document.js';

describe('CommonDidDocument', function () {
    const did = 'did:hedera:testnet:abc';
    const vm = {
        id: did + '#did-root-key',
        controller: did,
        type: 'Ed25519VerificationKey2018',
        publicKeyBase58: 'pubKey'
    };
    const document = {
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        verificationMethod: [vm],
        authentication: [did + '#did-root-key'],
        assertionMethod: [did + '#did-root-key'],
        service: [{ id: did + '#svc', type: 'LinkedDomains', serviceEndpoint: 'https://x' }]
    };

    it('static contexts', function () {
        assert.equal(CommonDidDocument.DID_DOCUMENT_CONTEXT, 'https://www.w3.org/ns/did/v1');
        assert.equal(CommonDidDocument.DID_DOCUMENT_TRANSMUTE_CONTEXT, 'https://ns.did.ai/transmute/v1');
    });

    it('from object parses did', function () {
        const doc = CommonDidDocument.from(document);
        assert.equal(doc.getDid(), did);
    });

    it('from string parses', function () {
        const doc = CommonDidDocument.from(JSON.stringify(document));
        assert.equal(doc.getDid(), did);
    });

    it('from invalid type throws', function () {
        assert.throws(() => CommonDidDocument.from(123), 'Invalid document format');
    });

    it('getDocument round-trips id and context', function () {
        const obj = CommonDidDocument.from(document).getDocument();
        assert.equal(obj.id, did);
        assert.equal(obj['@context'], 'https://www.w3.org/ns/did/v1');
    });

    it('getDocument maps verification methods', function () {
        const obj = CommonDidDocument.from(document).getDocument();
        assert.lengthOf(obj.verificationMethod, 1);
        assert.equal(obj.verificationMethod[0].id, vm.id);
    });

    it('getDocument keeps authentication string links', function () {
        const obj = CommonDidDocument.from(document).getDocument();
        assert.deepEqual(obj.authentication, [did + '#did-root-key']);
    });

    it('getDocument maps service', function () {
        const obj = CommonDidDocument.from(document).getDocument();
        assert.lengthOf(obj.service, 1);
        assert.equal(obj.service[0].serviceEndpoint, 'https://x');
    });

    it('getVerificationMethods returns array', function () {
        const doc = CommonDidDocument.from(document);
        assert.lengthOf(doc.getVerificationMethods(), 1);
    });

    it('getMethodByType finds method', function () {
        const doc = CommonDidDocument.from(document);
        const m = doc.getMethodByType('Ed25519VerificationKey2018');
        assert.exists(m);
        assert.equal(m.getId(), vm.id);
    });

    it('getMethodByType returns null when missing', function () {
        const doc = CommonDidDocument.from(document);
        assert.isNull(doc.getMethodByType('Unknown'));
    });

    it('getMethodByName finds method', function () {
        const doc = CommonDidDocument.from(document);
        const m = doc.getMethodByName(vm.id);
        assert.exists(m);
    });

    it('getMethodByName returns null when missing', function () {
        const doc = CommonDidDocument.from(document);
        assert.isNull(doc.getMethodByName('nope'));
    });

    it('getPrivateKeys empty without private key', function () {
        const doc = CommonDidDocument.from(document);
        assert.deepEqual(doc.getPrivateKeys(), []);
    });

    it('setPrivateKey then getPrivateKeys', function () {
        const doc = CommonDidDocument.from(document);
        doc.setPrivateKey(vm.id, 'secret');
        const keys = doc.getPrivateKeys();
        assert.lengthOf(keys, 1);
        assert.equal(keys[0].id, vm.id);
        assert.equal(keys[0].key, 'secret');
    });

    it('toCredentialHash is deterministic base58 string', function () {
        const h1 = CommonDidDocument.from(document).toCredentialHash();
        const h2 = CommonDidDocument.from(document).toCredentialHash();
        assert.isString(h1);
        assert.equal(h1, h2);
    });

    it('compare identical documents true', function () {
        const a = CommonDidDocument.from(document);
        const b = CommonDidDocument.from(document);
        assert.isTrue(a.compare(b));
    });

    it('compare with json string true', function () {
        const a = CommonDidDocument.from(document);
        assert.isTrue(a.compare(JSON.stringify(a.getDocument())));
    });

    it('compare different id false', function () {
        const a = CommonDidDocument.from(document);
        const b = CommonDidDocument.from({ ...document, id: 'did:hedera:testnet:other' });
        assert.isFalse(a.compare(b));
    });

    it('compare invalid input false', function () {
        const a = CommonDidDocument.from(document);
        assert.isFalse(a.compare('not json'));
    });

    it('getPrivateDocument excludes nothing when no keys', function () {
        const obj = CommonDidDocument.from(document).getPrivateDocument();
        assert.equal(obj.id, did);
    });
});
