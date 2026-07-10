import assert from 'node:assert/strict';
import { PrivateKey } from '@hiero-ledger/sdk';
import { HederaUtils } from '../dist/api/helpers/utils.js';

describe('HederaUtils.encode / decode', () => {
    it('encodes a Uint8Array to a string and back', () => {
        const original = new Uint8Array([1, 2, 3, 4, 5]);
        const encoded = HederaUtils.encode(original);
        const decoded = HederaUtils.decode(encoded);
        assert.deepEqual(Array.from(decoded), [1, 2, 3, 4, 5]);
    });

    it('round-trips ASCII text via decode/encode', () => {
        const decoded = HederaUtils.decode('hello');
        const encoded = HederaUtils.encode(decoded);
        assert.equal(encoded, 'hello');
    });
});

describe('HederaUtils.randomKey', () => {
    it('returns a non-empty string', () => {
        const key = HederaUtils.randomKey();
        assert.equal(typeof key, 'string');
        assert.ok(key.length > 0);
    });

    it('produces different keys across calls', () => {
        const a = HederaUtils.randomKey();
        const b = HederaUtils.randomKey();
        assert.notEqual(a, b);
    });
});

describe('HederaUtils.parsPrivateKey', () => {
    it('parses a valid private key string into a PrivateKey instance', () => {
        const seed = PrivateKey.generate();
        const result = HederaUtils.parsPrivateKey(seed.toString());
        assert.ok(result, 'expected a PrivateKey');
        // The parsed key should round-trip to the same string.
        assert.equal(result.toString(), seed.toString());
    });

    it('returns the input unchanged when it is already a PrivateKey', () => {
        const seed = PrivateKey.generate();
        const result = HederaUtils.parsPrivateKey(seed);
        assert.equal(result, seed);
    });

    it('throws "Invalid <keyName>" for malformed strings', () => {
        assert.throws(
            () => HederaUtils.parsPrivateKey('not-a-key', true, 'Operator Key'),
            /Invalid Operator Key/,
        );
    });

    it('throws "<keyName> is not set" when notNull=true and key is empty', () => {
        assert.throws(
            () => HederaUtils.parsPrivateKey('', true, 'Wallet Key'),
            /Wallet Key is not set/,
        );
        assert.throws(
            () => HederaUtils.parsPrivateKey(null, true),
            /Private Key is not set/,
        );
    });

    it('returns null when notNull=false and the key is empty', () => {
        assert.equal(HederaUtils.parsPrivateKey(null, false), null);
        assert.equal(HederaUtils.parsPrivateKey('', false), null);
    });
});
