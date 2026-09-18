import { assert } from 'chai';

import { HederaDid } from '../../../../../dist/hedera-modules/vcjs/did/hedera-did.js';
import { CommonDid } from '../../../../../dist/hedera-modules/vcjs/did/common-did.js';

describe('HederaDid', function () {
    const valid = 'did:hedera:testnet:abcdefKEY_0.0.123';

    it('static constants', function () {
        assert.equal(HederaDid.DID_TOPIC_SEPARATOR, '_');
        assert.equal(HederaDid.HEDERA_HCS, 'hedera');
        assert.equal(HederaDid.DID_TOPIC_ID, 'tid');
    });

    it('extends CommonDid', function () {
        const d = HederaDid.from(valid);
        assert.instanceOf(d, CommonDid);
    });

    it('parseV2 returns components', function () {
        const c = HederaDid.parseV2(valid);
        assert.equal(c.prefix, 'did');
        assert.equal(c.method, 'hedera');
        assert.equal(c.network, 'testnet');
        assert.equal(c.key, 'abcdefKEY');
        assert.equal(c.topicId, '0.0.123');
        assert.equal(c.identifier, 'abcdefKEY');
    });

    it('parseV2 throws without topic separator', function () {
        assert.throws(() => HederaDid.parseV2('did:hedera:testnet:abc'), 'invalid did format');
    });

    it('parseV2 throws on wrong part count', function () {
        assert.throws(() => HederaDid.parseV2('did:hedera:abc_0.0.1'), 'invalid did format');
    });

    it('parseV2 throws on invalid prefix', function () {
        assert.throws(() => HederaDid.parseV2('xid:hedera:testnet:abc_0.0.1'), 'invalid prefix');
    });

    it('parseV2 throws on invalid method', function () {
        assert.throws(() => HederaDid.parseV2('did:other:testnet:abc_0.0.1'), 'invalid method name');
    });

    it('parse throws on null', function () {
        assert.throws(() => HederaDid.parse(null), 'DID string cannot be null');
    });

    it('from builds with getters', function () {
        const d = HederaDid.from(valid);
        assert.equal(d.getMethod(), 'hedera');
        assert.equal(d.getNetwork(), 'testnet');
        assert.equal(d.toString(), valid);
        assert.isString(d.getIdentifier());
    });

    it('implement true for hedera did', function () {
        assert.isTrue(HederaDid.implement(valid));
    });

    it('implement false for non-hedera method', function () {
        assert.isFalse(HederaDid.implement('did:example:abc'));
    });

    it('implement false for non-string', function () {
        assert.isFalse(HederaDid.implement(null));
    });

    it('getTopicId extracts last segment', function () {
        assert.equal(HederaDid.getTopicId(valid), '0.0.123');
    });

    it('getTopicId returns whole string when no separator', function () {
        assert.equal(HederaDid.getTopicId('noseparator'), 'noseparator');
    });
});
