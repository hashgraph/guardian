import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { checkValidJwt } from '../dist/utils/validate-config-jwt-tokens.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const otherPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

describe('@unit checkValidJwt', () => {
    let originalConsoleError;
    before(() => {
        originalConsoleError = console.error;
        console.error = () => {};
    });
    after(() => { console.error = originalConsoleError; });

    describe('input validation', () => {
        it('returns false when private key is empty', () => {
            assert.equal(checkValidJwt(publicKey, ''), false);
        });

        it('returns false when public key is empty', () => {
            assert.equal(checkValidJwt('', privateKey), false);
        });

        it('returns false when both keys are empty', () => {
            assert.equal(checkValidJwt('', ''), false);
        });

        it('returns false when keys are too short (< 8 chars)', () => {
            assert.equal(checkValidJwt('abc', 'def'), false);
        });

        it('returns false when private key is whitespace only', () => {
            assert.equal(checkValidJwt(publicKey, '       '), false);
        });

        it('returns false when public key is whitespace only', () => {
            assert.equal(checkValidJwt('       ', privateKey), false);
        });

        it('returns false when private key is null', () => {
            assert.equal(checkValidJwt(publicKey, null), false);
        });

        it('returns false when public key is undefined', () => {
            assert.equal(checkValidJwt(undefined, privateKey), false);
        });
    });

    describe('PEM format check', () => {
        it('returns false for non-PEM strings of sufficient length', () => {
            const fake = 'a'.repeat(64);
            assert.equal(checkValidJwt(fake, fake), false);
        });

        it('returns false for almost-PEM (missing dashes)', () => {
            const fake = 'BEGIN RSA PUBLIC KEY ... END RSA PUBLIC KEY';
            assert.equal(checkValidJwt(fake, fake), false);
        });

        it('returns false for almost-PEM (missing END)', () => {
            const fake = '-----BEGIN RSA PUBLIC KEY-----\nbase64body\n';
            assert.equal(checkValidJwt(fake, fake), false);
        });

        it('returns false when private key looks like PEM but public does not', () => {
            assert.equal(checkValidJwt('not pem at all but long enough', privateKey), false);
        });
    });

    describe('cryptographic round-trip', () => {
        it('returns true for a valid RS256 key pair', () => {
            assert.equal(checkValidJwt(publicKey, privateKey), true);
        });

        it('returns false when public and private keys are from different pairs', () => {
            assert.equal(checkValidJwt(otherPair.publicKey, privateKey), false);
        });

        it('returns false when the private key body is corrupted', () => {
            // Corrupt the entire base64 body (preserving the PEM header/footer so
            // looksLikePem still passes). A single mangled line in a PKCS8 RSA key
            // is NOT a reliable corruption: the redundant CRT parameters let
            // OpenSSL recover a usable signing key, so the round-trip can still
            // verify. Damaging the whole body forces a genuine decode failure.
            const lines = privateKey.split('\n');
            for (let i = 1; i < lines.length - 2; i++) {
                if (lines[i].length > 0) lines[i] = 'A'.repeat(lines[i].length);
            }
            const corrupted = lines.join('\n');
            assert.equal(checkValidJwt(publicKey, corrupted), false);
        });

        it('returns false when the public key is corrupted in the middle', () => {
            const lines = publicKey.split('\n');
            const mid = Math.floor(lines.length / 2);
            lines[mid] = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
            const corrupted = lines.join('\n');
            assert.equal(checkValidJwt(corrupted, privateKey), false);
        });

        it('does not throw on any input — always returns boolean', () => {
            const cases = [
                [null, null],
                [undefined, undefined],
                ['', ''],
                ['x', 'y'],
                [publicKey, 'garbage'],
                ['garbage', privateKey],
                [Buffer.from('not-a-string'), privateKey],
            ];
            for (const [pub, priv] of cases) {
                let result;
                assert.doesNotThrow(() => { result = checkValidJwt(pub, priv); });
                assert.equal(typeof result, 'boolean');
            }
        });
    });
});
