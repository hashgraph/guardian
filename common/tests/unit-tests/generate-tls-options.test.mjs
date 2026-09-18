import assert from 'node:assert/strict';
import { GenerateTLSOptionsNats } from '../../dist/helpers/generate-tls-options.js';

describe('GenerateTLSOptionsNats', () => {
    const original = { cert: process.env.TLS_CERT, key: process.env.TLS_KEY, ca: process.env.TLS_CA };

    afterEach(() => {
        if (original.cert === undefined) delete process.env.TLS_CERT; else process.env.TLS_CERT = original.cert;
        if (original.key === undefined) delete process.env.TLS_KEY; else process.env.TLS_KEY = original.key;
        if (original.ca === undefined) delete process.env.TLS_CA; else process.env.TLS_CA = original.ca;
    });

    it('returns undefined when TLS_CERT is missing', () => {
        delete process.env.TLS_CERT;
        process.env.TLS_KEY = 'k';
        assert.equal(GenerateTLSOptionsNats(), undefined);
    });

    it('returns undefined when TLS_KEY is missing', () => {
        process.env.TLS_CERT = 'c';
        delete process.env.TLS_KEY;
        assert.equal(GenerateTLSOptionsNats(), undefined);
    });

    it('returns { cert, key, ca } when both cert and key are set', () => {
        process.env.TLS_CERT = 'CERT_PEM';
        process.env.TLS_KEY = 'KEY_PEM';
        process.env.TLS_CA = 'CA_PEM';
        assert.deepEqual(GenerateTLSOptionsNats(), { cert: 'CERT_PEM', key: 'KEY_PEM', ca: 'CA_PEM' });
    });

    it('returns { cert, key, ca: undefined } when CA is unset', () => {
        process.env.TLS_CERT = 'CERT_PEM';
        process.env.TLS_KEY = 'KEY_PEM';
        delete process.env.TLS_CA;
        assert.deepEqual(GenerateTLSOptionsNats(), { cert: 'CERT_PEM', key: 'KEY_PEM', ca: undefined });
    });
});
