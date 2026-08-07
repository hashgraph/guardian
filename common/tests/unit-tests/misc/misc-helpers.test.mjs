import { assert } from 'chai';
import { parseCsv } from '../../../dist/helpers/custom-csv-parser.js';
import { doNothing } from '../../../dist/helpers/do-nothing.js';
import { GenerateTLSOptionsNats } from '../../../dist/helpers/generate-tls-options.js';

describe('parseCsv', () => {
    it('parses a simple CSV with header row into records', () => {
        const result = parseCsv('name,age\nalice,30\nbob,25');
        assert.deepEqual(result, [
            { name: 'alice', age: '30' },
            { name: 'bob', age: '25' },
        ]);
    });

    it('trims whitespace in headers and values', () => {
        const result = parseCsv(' name , age \n alice , 30 ');
        assert.deepEqual(result, [{ name: 'alice', age: '30' }]);
    });

    it("fills missing trailing columns with ''", () => {
        const result = parseCsv('a,b,c\n1,2');
        assert.deepEqual(result, [{ a: '1', b: '2', c: '' }]);
    });

    it('returns [] when only the header row is present', () => {
        const result = parseCsv('a,b,c');
        assert.deepEqual(result, []);
    });
});

describe('doNothing', () => {
    it('returns undefined and does not throw', () => {
        assert.equal(doNothing(), undefined);
    });
});

describe('GenerateTLSOptionsNats', () => {
    let originalCert;
    let originalKey;
    let originalCa;

    before(() => {
        originalCert = process.env.TLS_CERT;
        originalKey = process.env.TLS_KEY;
        originalCa = process.env.TLS_CA;
    });

    after(() => {
        process.env.TLS_CERT = originalCert;
        process.env.TLS_KEY = originalKey;
        process.env.TLS_CA = originalCa;
    });

    it('returns undefined when TLS_CERT or TLS_KEY is missing', () => {
        delete process.env.TLS_CERT;
        delete process.env.TLS_KEY;
        assert.equal(GenerateTLSOptionsNats(), undefined);

        process.env.TLS_CERT = 'has-cert';
        delete process.env.TLS_KEY;
        assert.equal(GenerateTLSOptionsNats(), undefined);
    });

    it('returns the configured cert/key/ca when both are set', () => {
        process.env.TLS_CERT = 'CERT_VALUE';
        process.env.TLS_KEY = 'KEY_VALUE';
        process.env.TLS_CA = 'CA_VALUE';
        const opts = GenerateTLSOptionsNats();
        assert.deepEqual(opts, {
            cert: 'CERT_VALUE',
            key: 'KEY_VALUE',
            ca: 'CA_VALUE',
        });
    });

    it('returns ca=undefined when only TLS_CA is missing', () => {
        process.env.TLS_CERT = 'CERT';
        process.env.TLS_KEY = 'KEY';
        delete process.env.TLS_CA;
        const opts = GenerateTLSOptionsNats();
        assert.equal(opts.ca, undefined);
    });
});
