import assert from 'node:assert/strict';
import { GenerateTLSOptionsNats } from '../../../dist/helpers/generate-tls-options.js';

describe('GenerateTLSOptionsNats', () => {
    let saved;

    beforeEach(() => {
        saved = {
            cert: process.env.TLS_CERT,
            key: process.env.TLS_KEY,
            ca: process.env.TLS_CA,
        };
        delete process.env.TLS_CERT;
        delete process.env.TLS_KEY;
        delete process.env.TLS_CA;
    });

    afterEach(() => {
        for (const [name, value] of Object.entries({
            TLS_CERT: saved.cert,
            TLS_KEY: saved.key,
            TLS_CA: saved.ca,
        })) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
    });

    it('returns undefined when both TLS_CERT and TLS_KEY are unset', () => {
        assert.equal(GenerateTLSOptionsNats(), undefined);
    });

    it('returns undefined when only TLS_CERT is set', () => {
        process.env.TLS_CERT = 'cert-data';
        assert.equal(GenerateTLSOptionsNats(), undefined);
    });

    it('returns undefined when only TLS_KEY is set', () => {
        process.env.TLS_KEY = 'key-data';
        assert.equal(GenerateTLSOptionsNats(), undefined);
    });

    it('returns the cert/key/ca trio when both are set', () => {
        process.env.TLS_CERT = 'cert-data';
        process.env.TLS_KEY = 'key-data';
        process.env.TLS_CA = 'ca-data';
        assert.deepEqual(GenerateTLSOptionsNats(), {
            cert: 'cert-data',
            key: 'key-data',
            ca: 'ca-data',
        });
    });

    it('omits CA gracefully when only cert+key are set', () => {
        process.env.TLS_CERT = 'cert-data';
        process.env.TLS_KEY = 'key-data';
        const out = GenerateTLSOptionsNats();
        assert.equal(out.cert, 'cert-data');
        assert.equal(out.key, 'key-data');
        assert.equal(out.ca, undefined);
    });
});
