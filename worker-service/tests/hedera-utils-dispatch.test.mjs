import assert from 'node:assert/strict';
import { PrivateKey } from '@hiero-ledger/sdk';
import { HederaUtils } from '../dist/api/helpers/utils.js';

describe('@unit HederaUtils.parsPrivateKey — key form coverage', () => {
    it('parses an ED25519 DER-encoded string', () => {
        const key = PrivateKey.generateED25519();
        const result = HederaUtils.parsPrivateKey(key.toStringDer(), true, 'Op Key');
        assert.equal(result.toString(), key.toString());
    });

    it('parses an ED25519 raw hex string', () => {
        const key = PrivateKey.generateED25519();
        const result = HederaUtils.parsPrivateKey(key.toStringRaw());
        assert.equal(result.toString(), key.toString());
    });

    it('parses an ECDSA DER-encoded string', () => {
        const key = PrivateKey.generateECDSA();
        const result = HederaUtils.parsPrivateKey(key.toStringDer());
        assert.equal(result.toString(), key.toString());
    });

    it('returns a PrivateKey instance for a valid string', () => {
        const key = PrivateKey.generate();
        const result = HederaUtils.parsPrivateKey(key.toString());
        assert.ok(result instanceof PrivateKey);
    });

    it('round-trips the default-generated key string', () => {
        const key = PrivateKey.generate();
        assert.equal(HederaUtils.parsPrivateKey(key.toString()).toString(), key.toString());
    });

    it('passes through an ECDSA PrivateKey object unchanged', () => {
        const key = PrivateKey.generateECDSA();
        assert.equal(HederaUtils.parsPrivateKey(key, true, 'X'), key);
    });

    it('passes through a PrivateKey object even when notNull=false', () => {
        const key = PrivateKey.generate();
        assert.equal(HederaUtils.parsPrivateKey(key, false), key);
    });
});

describe('@unit HederaUtils.parsPrivateKey — invalid input branch', () => {
    it('throws "Invalid Private Key" for an arbitrary word', () => {
        assert.throws(() => HederaUtils.parsPrivateKey('garbage'), /^Error: Invalid Private Key$/);
    });

    it('throws "Invalid <keyName>" using a custom name', () => {
        assert.throws(() => HederaUtils.parsPrivateKey('garbage', true, 'Topic Key'), /Invalid Topic Key/);
    });

    it('throws Invalid for a too-short hex string', () => {
        assert.throws(() => HederaUtils.parsPrivateKey('abcdef'), /Invalid Private Key/);
    });

    it('throws Invalid for a whitespace-only non-empty string', () => {
        assert.throws(() => HederaUtils.parsPrivateKey('   '), /Invalid Private Key/);
    });

    it('throws an Error instance (not a string) on invalid input', () => {
        try {
            HederaUtils.parsPrivateKey('nope');
            assert.fail('expected throw');
        } catch (e) {
            assert.ok(e instanceof Error);
        }
    });

    it('throws Invalid rather than not-set for a non-empty bad string with notNull=false', () => {
        assert.throws(() => HederaUtils.parsPrivateKey('nope', false, 'K'), /Invalid K/);
    });
});

describe('@unit HederaUtils.parsPrivateKey — empty/null branch', () => {
    it('throws not-set for null with default keyName', () => {
        assert.throws(() => HederaUtils.parsPrivateKey(null), /^Error: Private Key is not set$/);
    });

    it('throws not-set for undefined when notNull=true', () => {
        assert.throws(() => HederaUtils.parsPrivateKey(undefined, true, 'Admin Key'), /Admin Key is not set/);
    });

    it('treats 0 as falsy and throws not-set', () => {
        assert.throws(() => HederaUtils.parsPrivateKey(0, true, 'Z'), /Z is not set/);
    });

    it('returns null for null when notNull=false', () => {
        assert.equal(HederaUtils.parsPrivateKey(null, false), null);
    });

    it('returns null for empty string when notNull=false with a custom name', () => {
        assert.equal(HederaUtils.parsPrivateKey('', false, 'Whatever'), null);
    });

    it('returns null for undefined when notNull=false', () => {
        assert.equal(HederaUtils.parsPrivateKey(undefined, false), null);
    });
});

describe('@unit HederaUtils.randomKey — structure', () => {
    it('returns a non-empty string', () => {
        const text = HederaUtils.randomKey();
        assert.equal(typeof text, 'string');
        assert.ok(text.length > 0);
    });

    it('decode(randomKey) is a Uint8Array', () => {
        assert.ok(HederaUtils.decode(HederaUtils.randomKey()) instanceof Uint8Array);
    });

    it('encode/decode round-trip is byte-lossy for non-ASCII bytes (utf8 corruption)', () => {
        const original = new Uint8Array([0xff, 0xfe, 0x80, 0x90]);
        const roundTripped = HederaUtils.decode(HederaUtils.encode(original));
        assert.notDeepEqual(Array.from(roundTripped), Array.from(original));
        assert.ok(roundTripped.length > original.length);
    });
});

describe('@unit HederaUtils.encode/decode — additional binary coverage', () => {
    it('encode produces the latin1/utf8 string of a Buffer', () => {
        assert.equal(HederaUtils.encode(Buffer.from([72, 73])), 'HI');
    });

    it('decode then encode round-trips a printable ASCII string', () => {
        const s = 'Guardian-123';
        assert.equal(HederaUtils.encode(HederaUtils.decode(s)), s);
    });

    it('decode length equals utf8 byte length, not char length', () => {
        const out = HederaUtils.decode('café');
        assert.equal(out.length, Buffer.byteLength('café', 'utf8'));
    });

    it('encode of a single zero byte is a NUL string of length 1', () => {
        const out = HederaUtils.encode(new Uint8Array([0]));
        assert.equal(out.length, 1);
        assert.equal(out.charCodeAt(0), 0);
    });

    it('decode of multibyte text yields more bytes than characters', () => {
        const out = HederaUtils.decode('☃');
        assert.ok(out.length > 1);
    });

    it('encode accepts a plain number array via Buffer.from', () => {
        assert.equal(HederaUtils.encode([97, 98, 99]), 'abc');
    });
});
