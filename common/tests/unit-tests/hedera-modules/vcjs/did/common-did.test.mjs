import { assert } from 'chai';

import { CommonDid } from '../../../../../dist/hedera-modules/vcjs/did/common-did.js';

describe('CommonDid', function () {
    it('static separators', function () {
        assert.equal(CommonDid.DID_PREFIX, 'did');
        assert.equal(CommonDid.DID_METHOD_SEPARATOR, ':');
    });

    it('parse returns components', function () {
        const c = CommonDid.parse('did:hedera:testnet:abc');
        assert.equal(c.prefix, 'did');
        assert.equal(c.method, 'hedera');
        assert.equal(c.identifier, 'testnet:abc');
    });

    it('parse simple identifier', function () {
        const c = CommonDid.parse('did:example:123');
        assert.equal(c.identifier, '123');
    });

    it('parse throws on null', function () {
        assert.throws(() => CommonDid.parse(null), 'DID string cannot be null');
    });

    it('parse throws on non-string', function () {
        assert.throws(() => CommonDid.parse(123), 'DID string cannot be null');
    });

    it('parse throws on too few parts', function () {
        assert.throws(() => CommonDid.parse('did:example'), 'invalid did format');
    });

    it('parse throws on wrong prefix', function () {
        assert.throws(() => CommonDid.parse('xid:example:123'), 'invalid did format');
    });

    it('from builds CommonDid with getters', function () {
        const did = CommonDid.from('did:hedera:testnet:abc');
        assert.equal(did.getMethod(), 'hedera');
        assert.equal(did.getIdentifier(), 'testnet:abc');
        assert.equal(did.toString(), 'did:hedera:testnet:abc');
    });

    it('implement true for did prefix', function () {
        assert.isTrue(CommonDid.implement('did:example:1'));
    });

    it('implement false for wrong prefix', function () {
        assert.isFalse(CommonDid.implement('foo:example:1'));
    });

    it('implement false for null', function () {
        assert.isFalse(CommonDid.implement(null));
    });

    it('implement false for non-string', function () {
        assert.isFalse(CommonDid.implement(5));
    });
});
