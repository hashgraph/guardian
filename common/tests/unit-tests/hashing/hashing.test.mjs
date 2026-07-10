import { assert } from 'chai';
import { Hashing } from '../../../dist/hedera-modules/hashing.js';

describe('Hashing.sha256', () => {
    it('produces the documented sha256 of an empty string', () => {
        const digest = Hashing.sha256.digest('');
        const hex = Buffer.from(digest).toString('hex');
        assert.equal(
            hex,
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
    });

    it('hashes a UTF-8 string deterministically', () => {
        const a = Hashing.sha256.digest('hello');
        const b = Hashing.sha256.digest('hello');
        assert.equal(Buffer.from(a).toString('hex'), Buffer.from(b).toString('hex'));
    });

    it('returns a 32-byte digest', () => {
        const digest = Hashing.sha256.digest('anything');
        assert.equal(digest.length, 32);
    });
});

describe('Hashing.base58', () => {
    it('round-trips arbitrary byte data', () => {
        const original = new Uint8Array([1, 2, 3, 4, 250, 251, 252, 253]);
        const encoded = Hashing.base58.encode(original);
        const decoded = Hashing.base58.decode(encoded);
        assert.deepEqual(Array.from(decoded), Array.from(original));
    });

    it('produces alphanumeric output (no 0OIl)', () => {
        const encoded = Hashing.base58.encode(new Uint8Array([0xff, 0xff, 0xff]));
        assert.notMatch(encoded, /[0OIl]/);
    });
});

describe('Hashing.base64', () => {
    it('round-trips ASCII strings', () => {
        const original = 'hello world';
        const encoded = Hashing.base64.encode(original);
        const decoded = Hashing.base64.decode(encoded);
        assert.equal(decoded, original);
    });

    it('produces valid base64 padding for non-multiple-of-3 lengths', () => {
        const encoded = Hashing.base64.encode('a');
        // 'a' is 1 byte → 4-char base64 with two '=' padding ('YQ==')
        assert.equal(encoded, 'YQ==');
    });
});
