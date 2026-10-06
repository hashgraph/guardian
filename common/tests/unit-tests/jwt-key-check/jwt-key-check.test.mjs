import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { checkRsaKey, checkRsaKeyPair } from '../../../dist/security/jwt-key-check.js';
import { JwtServicesValidator } from '../../../dist/security/jwt-services-validator.js';

const rsaPair = (modulusLength) => generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const { privateKey, publicKey } = rsaPair(2048);
const otherPair = rsaPair(2048);
const smallPair = rsaPair(1024);
const ecPair = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const check = (pub, priv) => checkRsaKeyPair(pub, priv, 'JWT_PUBLIC_KEY', 'JWT_PRIVATE_KEY');

describe('@unit checkRsaKeyPair', () => {
    describe('input validation', () => {
        it('reports an empty private key', () => {
            assert.equal(check(publicKey, ''), 'JWT_PRIVATE_KEY is missing or empty');
        });

        it('reports an empty public key', () => {
            assert.equal(check('', privateKey), 'JWT_PUBLIC_KEY is missing or empty');
        });

        it('reports the private key first when both keys are empty', () => {
            assert.equal(check('', ''), 'JWT_PRIVATE_KEY is missing or empty');
        });

        it('reports keys that are too short (< 8 chars)', () => {
            assert.equal(check('abc', 'def'), 'JWT_PRIVATE_KEY is missing or empty');
        });

        it('reports a whitespace-only private key', () => {
            assert.equal(check(publicKey, '       '), 'JWT_PRIVATE_KEY is missing or empty');
        });

        it('reports a whitespace-only public key', () => {
            assert.equal(check('       ', privateKey), 'JWT_PUBLIC_KEY is missing or empty');
        });

        it('reports a null private key', () => {
            assert.equal(check(publicKey, null), 'JWT_PRIVATE_KEY is missing or empty');
        });

        it('reports an undefined public key', () => {
            assert.equal(check(undefined, privateKey), 'JWT_PUBLIC_KEY is missing or empty');
        });
    });

    describe('PEM format check', () => {
        it('reports non-PEM strings of sufficient length', () => {
            const fake = 'a'.repeat(64);
            assert.equal(check(fake, fake), 'JWT_PRIVATE_KEY is not a valid PEM string');
        });

        it('reports almost-PEM (missing dashes)', () => {
            const fake = 'BEGIN RSA PUBLIC KEY ... END RSA PUBLIC KEY';
            assert.equal(check(fake, fake), 'JWT_PRIVATE_KEY is not a valid PEM string');
        });

        it('reports almost-PEM (missing END)', () => {
            const fake = '-----BEGIN RSA PUBLIC KEY-----\nbase64body\n';
            assert.equal(check(fake, fake), 'JWT_PRIVATE_KEY is not a valid PEM string');
        });

        it('reports a public key that does not look like PEM', () => {
            assert.equal(check('not pem at all but long enough', privateKey), 'JWT_PUBLIC_KEY is not a valid PEM string');
        });

        it('reports a non-string key', () => {
            assert.equal(check(publicKey, Buffer.from('not-a-string')), 'JWT_PRIVATE_KEY is not a valid PEM string');
        });
    });

    describe('key type and size', () => {
        it('reports an RSA private key below 2048 bits', () => {
            assert.equal(
                check(smallPair.publicKey, smallPair.privateKey),
                'JWT_PRIVATE_KEY is a 1024-bit RSA key; at least 2048 bits are required'
            );
        });

        it('reports an RSA public key below 2048 bits', () => {
            assert.equal(
                check(smallPair.publicKey, privateKey),
                'JWT_PUBLIC_KEY is a 1024-bit RSA key; at least 2048 bits are required'
            );
        });

        it('reports a non-RSA key', () => {
            assert.equal(
                check(publicKey, ecPair.privateKey),
                'JWT_PRIVATE_KEY is not an RSA key (key type: ec); an RSA key is required'
            );
        });
    });

    describe('cryptographic round-trip', () => {
        it('returns null for a valid RS256 key pair', () => {
            assert.equal(check(publicKey, privateKey), null);
        });

        it('reports keys from different pairs', () => {
            assert.match(check(otherPair.publicKey, privateKey), /do not form a valid key pair/);
        });

        it('reports a private key whose body is corrupted', () => {
            // Corrupt the entire base64 body (preserving the PEM header/footer so
            // the PEM check still passes). A single mangled line in a PKCS8 RSA key
            // is NOT a reliable corruption: the redundant CRT parameters let
            // OpenSSL recover a usable signing key, so the round-trip can still
            // verify. Damaging the whole body forces a genuine decode failure.
            const lines = privateKey.split('\n');
            for (let i = 1; i < lines.length - 2; i++) {
                if (lines[i].length > 0) lines[i] = 'A'.repeat(lines[i].length);
            }
            assert.match(check(publicKey, lines.join('\n')), /^JWT_PRIVATE_KEY cannot be parsed/);
        });

        it('reports a public key corrupted in the middle', () => {
            const lines = publicKey.split('\n');
            const mid = Math.floor(lines.length / 2);
            lines[mid] = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
            assert.match(check(lines.join('\n'), privateKey), /JWT_PUBLIC_KEY/);
        });

        it('does not throw on any input — always returns a string or null', () => {
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
                assert.doesNotThrow(() => { result = check(pub, priv); });
                assert.equal(typeof result, 'string');
            }
        });
    });
});

describe('@unit checkRsaKey', () => {
    it('returns null for a valid 2048-bit private key', () => {
        assert.equal(checkRsaKey(privateKey, 'KEY', 'private'), null);
    });

    it('returns null for a valid 2048-bit public key', () => {
        assert.equal(checkRsaKey(publicKey, 'KEY', 'public'), null);
    });
});

describe('@unit JwtServicesValidator.checkKeys', () => {
    const KEYS = [
        'QM_VERIFICATION',
        'SERVICE_JWT_SECRET_KEY',
        'SERVICE_JWT_SECRET_KEY_ALL',
        'SERVICE_JWT_PUBLIC_KEY_ALL',
        'SERVICE_JWT_PUBLIC_KEY_TEST_SERVICE',
        'SERVICE_JWT_PUBLIC_KEY_AUTH_SERVICE',
    ];
    let saved;

    beforeEach(() => {
        saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
        for (const key of Object.keys(process.env)) {
            if (key.startsWith('SERVICE_JWT_')) {
                delete process.env[key];
            }
        }
        delete process.env.QM_VERIFICATION;
        JwtServicesValidator.setServiceName('TEST_SERVICE');
    });

    afterEach(() => {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    it('returns no errors for a valid shared key pair', () => {
        process.env.SERVICE_JWT_SECRET_KEY_ALL = privateKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_ALL = publicKey;
        assert.deepEqual(JwtServicesValidator.checkKeys(), []);
    });

    it('reports an undersized shared secret key', () => {
        process.env.SERVICE_JWT_SECRET_KEY_ALL = smallPair.privateKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_ALL = smallPair.publicKey;
        assert.deepEqual(JwtServicesValidator.checkKeys(), [
            'SERVICE_JWT_SECRET_KEY_ALL is a 1024-bit RSA key; at least 2048 bits are required',
        ]);
    });

    it('prefers the service own secret and public keys over the shared ones', () => {
        process.env.SERVICE_JWT_SECRET_KEY = smallPair.privateKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_TEST_SERVICE = smallPair.publicKey;
        process.env.SERVICE_JWT_SECRET_KEY_ALL = privateKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_ALL = publicKey;
        assert.deepEqual(JwtServicesValidator.checkKeys(), [
            'SERVICE_JWT_SECRET_KEY is a 1024-bit RSA key; at least 2048 bits are required',
        ]);
    });

    it('reports a secret key that does not match its public key', () => {
        process.env.SERVICE_JWT_SECRET_KEY_ALL = privateKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_ALL = otherPair.publicKey;
        assert.match(JwtServicesValidator.checkKeys()[0], /do not form a valid key pair/);
    });

    it('reports an undersized public key of another service', () => {
        process.env.SERVICE_JWT_SECRET_KEY_ALL = privateKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_ALL = publicKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_AUTH_SERVICE = smallPair.publicKey;
        assert.deepEqual(JwtServicesValidator.checkKeys(), [
            'SERVICE_JWT_PUBLIC_KEY_AUTH_SERVICE is a 1024-bit RSA key; at least 2048 bits are required',
        ]);
    });

    it('ignores "..." placeholder public keys', () => {
        process.env.SERVICE_JWT_SECRET_KEY_ALL = privateKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_ALL = publicKey;
        process.env.SERVICE_JWT_PUBLIC_KEY_AUTH_SERVICE = '...';
        assert.deepEqual(JwtServicesValidator.checkKeys(), []);
    });

    it('reports a missing secret key', () => {
        assert.deepEqual(JwtServicesValidator.checkKeys(), ['SERVICE_JWT_SECRET_KEY_ALL is missing or empty']);
    });

    it('skips the check when QM_VERIFICATION is false', () => {
        process.env.QM_VERIFICATION = 'false';
        process.env.SERVICE_JWT_SECRET_KEY_ALL = smallPair.privateKey;
        assert.deepEqual(JwtServicesValidator.checkKeys(), []);
    });
});
