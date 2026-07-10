import { assert } from 'chai';
import { Hashing } from '../../../dist/hedera-modules/hashing.js';
import { EncryptUtils } from '../../../dist/helpers/encrypt-utils.js';

const hex = (d) => Buffer.from(d).toString('hex');

describe('@unit Hashing.sha256 edge cases', () => {
    it('empty string digests to the canonical sha256 empty hash', () => {
        assert.equal(
            hex(Hashing.sha256.digest('')),
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
    });

    it('empty Buffer matches empty string digest', () => {
        assert.equal(
            hex(Hashing.sha256.digest(Buffer.alloc(0))),
            hex(Hashing.sha256.digest('')),
        );
    });

    it('is deterministic across repeated calls', () => {
        const input = 'determinism-check';
        assert.equal(hex(Hashing.sha256.digest(input)), hex(Hashing.sha256.digest(input)));
    });

    it('always returns exactly 32 bytes regardless of input size', () => {
        assert.equal(Hashing.sha256.digest('').length, 32);
        assert.equal(Hashing.sha256.digest('a').length, 32);
        assert.equal(Hashing.sha256.digest('a'.repeat(100000)).length, 32);
    });

    it('different inputs produce different digests (collision-shape)', () => {
        assert.notEqual(hex(Hashing.sha256.digest('abc')), hex(Hashing.sha256.digest('abd')));
    });

    it('single-bit-ish change avalanches the digest', () => {
        const a = hex(Hashing.sha256.digest('hello'));
        const b = hex(Hashing.sha256.digest('Hello'));
        assert.notEqual(a, b);
    });

    it('handles unicode/multibyte input deterministically', () => {
        const s = 'café-naïve-Ω-Ä';
        assert.equal(hex(Hashing.sha256.digest(s)), hex(Hashing.sha256.digest(s)));
    });

    it('hashes emoji input as its UTF-8 byte sequence', () => {
        const emoji = '😀🚀🔥';
        assert.equal(
            hex(Hashing.sha256.digest(emoji)),
            hex(Hashing.sha256.digest(Buffer.from(emoji, 'utf8'))),
        );
    });

    it('string and equivalent UTF-8 Buffer hash identically', () => {
        assert.equal(
            hex(Hashing.sha256.digest('hello world')),
            hex(Hashing.sha256.digest(Buffer.from('hello world', 'utf8'))),
        );
    });

    it('hashes raw binary (all byte values 0..255)', () => {
        const bin = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
        assert.equal(Hashing.sha256.digest(bin).length, 32);
        assert.equal(hex(Hashing.sha256.digest(bin)), hex(Hashing.sha256.digest(bin)));
    });

    it('hashes a very large 1MB input deterministically', () => {
        const big = Buffer.alloc(1024 * 1024, 0xab);
        assert.equal(hex(Hashing.sha256.digest(big)), hex(Hashing.sha256.digest(big)));
    });

    it('treats a Uint8Array view the same as the backing Buffer', () => {
        const buf = Buffer.from([10, 20, 30, 40]);
        const view = new Uint8Array(buf);
        assert.equal(hex(Hashing.sha256.digest(view)), hex(Hashing.sha256.digest(buf)));
    });

    it('returns a Buffer instance', () => {
        assert.isTrue(Buffer.isBuffer(Hashing.sha256.digest('x')));
    });

    it('throws on null input', () => {
        assert.throws(() => Hashing.sha256.digest(null));
    });

    it('throws on undefined input', () => {
        assert.throws(() => Hashing.sha256.digest(undefined));
    });

    it('throws on a plain number input', () => {
        assert.throws(() => Hashing.sha256.digest(12345));
    });
});

describe('@unit Hashing.base58 edge cases', () => {
    it('round-trips an empty byte array', () => {
        const encoded = Hashing.base58.encode(new Uint8Array([]));
        assert.equal(encoded, '');
        const decoded = Hashing.base58.decode(encoded);
        assert.equal(decoded.length, 0);
    });

    it('round-trips arbitrary binary including leading zeros', () => {
        const original = new Uint8Array([0, 0, 1, 2, 3, 255, 254, 0]);
        const decoded = Hashing.base58.decode(Hashing.base58.encode(original));
        assert.deepEqual(Array.from(decoded), Array.from(original));
    });

    it('preserves leading zero bytes as leading 1s', () => {
        const encoded = Hashing.base58.encode(new Uint8Array([0, 0, 5]));
        assert.match(encoded, /^11/);
    });

    it('round-trips a full 32-byte digest', () => {
        const digest = Hashing.sha256.digest('payload');
        const decoded = Hashing.base58.decode(Hashing.base58.encode(digest));
        assert.deepEqual(Array.from(decoded), Array.from(digest));
    });

    it('is deterministic for the same input', () => {
        const data = new Uint8Array([9, 8, 7, 6, 5]);
        assert.equal(Hashing.base58.encode(data), Hashing.base58.encode(data));
    });

    it('produces output free of the ambiguous 0OIl alphabet', () => {
        const encoded = Hashing.base58.encode(new Uint8Array([255, 255, 255, 255, 255]));
        assert.notMatch(encoded, /[0OIl]/);
    });

    it('decode returns a Buffer instance', () => {
        const decoded = Hashing.base58.decode(Hashing.base58.encode(new Uint8Array([1, 2, 3])));
        assert.isTrue(Buffer.isBuffer(decoded));
    });

    it('different inputs yield different encodings', () => {
        assert.notEqual(
            Hashing.base58.encode(new Uint8Array([1, 2, 3])),
            Hashing.base58.encode(new Uint8Array([1, 2, 4])),
        );
    });

    it('throws when decoding a string with non-base58 characters', () => {
        assert.throws(() => Hashing.base58.decode('0OIl'));
    });
});

describe('@unit Hashing.base64 edge cases', () => {
    it('round-trips an empty string', () => {
        assert.equal(Hashing.base64.encode(''), '');
        assert.equal(Hashing.base64.decode(''), '');
    });

    it('emits two padding chars for a 1-byte input', () => {
        assert.equal(Hashing.base64.encode('a'), 'YQ==');
    });

    it('emits one padding char for a 2-byte input', () => {
        assert.equal(Hashing.base64.encode('ab'), 'YWI=');
    });

    it('emits no padding for a 3-byte input', () => {
        assert.equal(Hashing.base64.encode('abc'), 'YWJj');
    });

    it('round-trips unicode/multibyte content', () => {
        const s = 'café-Ω-😀';
        assert.equal(Hashing.base64.decode(Hashing.base64.encode(s)), s);
    });

    it('is deterministic for the same input', () => {
        assert.equal(Hashing.base64.encode('determinism'), Hashing.base64.encode('determinism'));
    });

    it('round-trips a long input', () => {
        const s = 'x'.repeat(50000);
        assert.equal(Hashing.base64.decode(Hashing.base64.encode(s)), s);
    });

    it('different inputs yield different encodings', () => {
        assert.notEqual(Hashing.base64.encode('aaa'), Hashing.base64.encode('aab'));
    });

    it('decode returns a JS string (lossy for binary, text-only round-trip)', () => {
        const digest = Hashing.sha256.digest('seed');
        const encoded = Hashing.base64.encode(digest);
        const decoded = Hashing.base64.decode(encoded);
        assert.isString(decoded);
        assert.notEqual(Hashing.base64.encode(Buffer.from(decoded, 'binary')), encoded);
    });
});

describe('@unit EncryptUtils edge cases', function () {
    this.timeout(60000);

    it('empty-buffer ciphertext cannot be decrypted (cryppo NULL-algorithm; latent bug)', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.alloc(0), 'key');
        assert.match(enc.toString('utf8'), /^null\./);
        let err;
        try {
            await EncryptUtils.decrypt(enc, 'key');
        } catch (e) {
            err = e;
        }
        assert.isDefined(err);
        assert.match(err.message, /Unsupported algorithm: NULL/i);
    });

    it('round-trips unicode/emoji payload with byte fidelity', async () => {
        const plain = Buffer.from('café-😀-Ω-naïve', 'utf8');
        const enc = await EncryptUtils.encrypt(plain, 'unicode-key');
        const dec = await EncryptUtils.decrypt(enc, 'unicode-key');
        assert.equal(dec.toString('utf8'), 'café-😀-Ω-naïve');
    });

    it('round-trips arbitrary binary (all 256 byte values)', async () => {
        const plain = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
        const enc = await EncryptUtils.encrypt(plain, 'bin-key');
        const dec = await EncryptUtils.decrypt(enc, 'bin-key');
        assert.deepEqual(Array.from(dec), Array.from(plain));
    });

    it('round-trips a large 64KB payload', async () => {
        const plain = Buffer.alloc(64 * 1024, 0x5a);
        const enc = await EncryptUtils.encrypt(plain, 'big-key');
        const dec = await EncryptUtils.decrypt(enc, 'big-key');
        assert.deepEqual(Array.from(dec.subarray(0, 16)), Array.from(plain.subarray(0, 16)));
        assert.equal(dec.length, plain.length);
    });

    it('accepts a unicode passphrase and round-trips', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('payload'), 'pä$$-😀-Ω');
        const dec = await EncryptUtils.decrypt(enc, 'pä$$-😀-Ω');
        assert.equal(dec.toString('utf8'), 'payload');
    });

    it('produces ciphertext distinct from plaintext', async () => {
        const plain = Buffer.from('visible?', 'utf8');
        const enc = await EncryptUtils.encrypt(plain, 'k');
        assert.notEqual(Buffer.from(enc).toString('utf8'), plain.toString('utf8'));
    });

    it('uses random IV/salt: two encrypts of same input differ', async () => {
        const plain = Buffer.from('same-input', 'utf8');
        const a = await EncryptUtils.encrypt(plain, 'k');
        const b = await EncryptUtils.encrypt(plain, 'k');
        assert.notEqual(Buffer.from(a).toString('utf8'), Buffer.from(b).toString('utf8'));
    });

    it('decrypts the same ciphertext idempotently', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('idem'), 'k');
        const a = await EncryptUtils.decrypt(enc, 'k');
        const b = await EncryptUtils.decrypt(enc, 'k');
        assert.equal(a.toString('utf8'), b.toString('utf8'));
    });

    it('encrypt throws when key is empty string', async () => {
        let err;
        try {
            await EncryptUtils.encrypt(Buffer.from('x'), '');
        } catch (e) {
            err = e;
        }
        assert.isDefined(err);
        assert.match(err.message, /no appropriate private key/i);
    });

    it('encrypt throws when key is undefined', async () => {
        let err;
        try {
            await EncryptUtils.encrypt(Buffer.from('x'), undefined);
        } catch (e) {
            err = e;
        }
        assert.isDefined(err);
        assert.match(err.message, /no appropriate private key/i);
    });

    it('encrypt throws when key is null', async () => {
        let err;
        try {
            await EncryptUtils.encrypt(Buffer.from('x'), null);
        } catch (e) {
            err = e;
        }
        assert.isDefined(err);
        assert.match(err.message, /no appropriate private key/i);
    });

    it('decrypt with the wrong key rejects (AES-GCM auth tag)', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('top-secret'), 'right-key');
        let threw = false;
        try {
            await EncryptUtils.decrypt(enc, 'wrong-key');
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    it('decrypt of garbage serialized data rejects', async () => {
        let threw = false;
        try {
            await EncryptUtils.decrypt(Buffer.from('not-a-valid-cryppo-string'), 'k');
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    it('decrypt of an empty buffer rejects', async () => {
        let threw = false;
        try {
            await EncryptUtils.decrypt(Buffer.alloc(0), 'k');
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    it('decrypt of truncated ciphertext rejects', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('truncate-me-please'), 'k');
        const truncated = Buffer.from(enc).subarray(0, Math.floor(enc.length / 2));
        let threw = false;
        try {
            await EncryptUtils.decrypt(truncated, 'k');
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    it('decrypt of tampered ciphertext body rejects', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('tamper-target'), 'k');
        const tampered = Buffer.from(enc);
        tampered[tampered.length - 2] = tampered[tampered.length - 2] ^ 0xff;
        let threw = false;
        try {
            await EncryptUtils.decrypt(tampered, 'k');
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    it('encrypt accepts a string payload (Buffer.from coercion)', async () => {
        const enc = await EncryptUtils.encrypt('plain-string-payload', 'k');
        const dec = await EncryptUtils.decrypt(enc, 'k');
        assert.equal(dec.toString('utf8'), 'plain-string-payload');
    });

    it('returns a Buffer from encrypt', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('x'), 'k');
        assert.isTrue(Buffer.isBuffer(enc));
    });

    it('returns a Buffer from decrypt', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('x'), 'k');
        const dec = await EncryptUtils.decrypt(enc, 'k');
        assert.isTrue(Buffer.isBuffer(dec));
    });

    it('a key differing by one character fails to decrypt', async () => {
        const enc = await EncryptUtils.encrypt(Buffer.from('secret'), 'passphrase');
        let threw = false;
        try {
            await EncryptUtils.decrypt(enc, 'passphras3');
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });
});
