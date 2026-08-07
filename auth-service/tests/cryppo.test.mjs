import { assert } from 'chai';
import baseX from 'base-x';
import { Cryppo } from '../dist/meeco/cryppo.js';

const base32Alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeBase32(str) {
    const bytes = Uint8Array.from(Buffer.from(str, 'binary'));
    return baseX(base32Alphabet).encode(bytes);
}

describe('@unit Cryppo.decodeBase32', () => {
    it('round-trips a base32-encoded ascii passphrase', () => {
        const passphrase = 'hello';
        const encoded = encodeBase32(passphrase);
        const c = new Cryppo(encoded);
        assert.equal(c.decodeBase32(encoded), passphrase);
    });

    it('strips hyphens before decoding', () => {
        const passphrase = 'world';
        const encoded = encodeBase32(passphrase);
        const hyphenated = encoded.match(/.{1,2}/g).join('-');
        const c = new Cryppo(encoded);
        assert.equal(c.decodeBase32(hyphenated), passphrase);
    });

    it('trims surrounding whitespace before decoding', () => {
        const passphrase = 'abc';
        const encoded = encodeBase32(passphrase);
        const c = new Cryppo(encoded);
        assert.equal(c.decodeBase32(`  ${encoded}  `), passphrase);
    });

    it('decodes a single-byte value', () => {
        const encoded = encodeBase32('Z');
        const c = new Cryppo(encoded);
        assert.equal(c.decodeBase32(encoded), 'Z');
    });
});

describe('@unit Cryppo.iDerivedKeyToParams', () => {
    const c = new Cryppo(encodeBase32('seed'));

    it('applies all defaults when no artifacts supplied', () => {
        const params = c.iDerivedKeyToParams();
        assert.equal(params.iterationVariance, 0);
        assert.equal(params.minIterations, 10000);
        assert.equal(params.length, 32);
        assert.equal(params.useSalt, '');
        assert.equal(params.hash, 'SHA256');
        assert.isString(params.strategy);
    });

    it('applies all defaults for an empty artifacts object', () => {
        const params = c.iDerivedKeyToParams({});
        assert.equal(params.minIterations, 10000);
        assert.equal(params.length, 32);
        assert.equal(params.hash, 'SHA256');
    });

    it('honours provided iterations, length, salt and hash', () => {
        const params = c.iDerivedKeyToParams({
            iterations: 50000,
            length: 64,
            salt: 'mysalt',
            hash: 'SHA512',
        });
        assert.equal(params.minIterations, 50000);
        assert.equal(params.length, 64);
        assert.equal(params.useSalt, 'mysalt');
        assert.equal(params.hash, 'SHA512');
    });

    it('falls back to defaults for zero/falsy numeric artifacts', () => {
        const params = c.iDerivedKeyToParams({ iterations: 0, length: 0 });
        assert.equal(params.minIterations, 10000);
        assert.equal(params.length, 32);
    });

    it('iterationVariance is always 0 regardless of input', () => {
        const params = c.iDerivedKeyToParams({ iterations: 99999 });
        assert.equal(params.iterationVariance, 0);
    });
});

describe('@unit Cryppo.deriveMEK — artifact validation', () => {
    const c = new Cryppo(encodeBase32('seed'));

    it('throws when only derivationArtifacts is provided', async () => {
        let threw = false;
        try {
            await c.deriveMEK('something', '');
        } catch (e) {
            threw = true;
            assert.match(e.message, /both artefacts/);
        }
        assert.isTrue(threw);
    });

    it('throws when only verificationArtifacts is provided', async () => {
        let threw = false;
        try {
            await c.deriveMEK('', 'something');
        } catch (e) {
            threw = true;
            assert.match(e.message, /both artefacts/);
        }
        assert.isTrue(threw);
    });
});
