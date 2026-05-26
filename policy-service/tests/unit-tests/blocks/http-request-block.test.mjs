import { assert } from 'chai';
import { HttpRequestBlock } from '../../../dist/policy-engine/block-validators/blocks/http-request-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const baseRef = (overrides = {}) => ({
    options: {
        url: 'https://example.com/api',
        method: 'GET',
        ...overrides,
    },
    children: [],
});

describe('HttpRequestBlock.validate', () => {
    let prevAllowed;
    let prevBlockPrivate;
    before(() => {
        prevAllowed = process.env.ALLOWED_PROTOCOLS;
        prevBlockPrivate = process.env.BLOCK_PRIVATE_IP;
        process.env.ALLOWED_PROTOCOLS = 'http,https';
        process.env.BLOCK_PRIVATE_IP = 'false';
    });
    after(() => {
        process.env.ALLOWED_PROTOCOLS = prevAllowed;
        process.env.BLOCK_PRIVATE_IP = prevBlockPrivate;
    });

    it('accepts a well-formed https GET', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, baseRef());
        assert.deepEqual(v.errors, []);
    });

    it('rejects empty url', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, baseRef({ url: '   ' }));
        assert.include(v.errors, 'Option "url" must be set');
    });

    it('rejects unknown HTTP method', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, baseRef({ method: 'OPTIONS' }));
        assert.include(
            v.errors,
            'Option "method" must be "GET", "POST", "PUT", "PATCH" or "DELETE"',
        );
    });

    it('accepts case-insensitive method names', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, baseRef({ method: 'post' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects disallowed protocol', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, baseRef({ url: 'ftp://example.com/file' }));
        assert.isTrue(v.errors.some((e) => e.includes('Protocol "ftp:" is not allowed')));
    });

    it('errors when ALLOWED_PROTOCOLS is unset', async () => {
        const original = process.env.ALLOWED_PROTOCOLS;
        delete process.env.ALLOWED_PROTOCOLS;
        try {
            const v = new FakeValidator();
            await HttpRequestBlock.validate(v, baseRef());
            assert.isTrue(v.errors.some((e) => e.includes('ALLOWED_PROTOCOLS')));
        } finally {
            process.env.ALLOWED_PROTOCOLS = original;
        }
    });

    it('blocks IPv4 loopback when BLOCK_PRIVATE_IP=true', async () => {
        const original = process.env.BLOCK_PRIVATE_IP;
        process.env.BLOCK_PRIVATE_IP = 'true';
        try {
            const v = new FakeValidator();
            await HttpRequestBlock.validate(v, baseRef({ url: 'http://127.0.0.1/health' }));
            assert.isTrue(
                v.errors.some((e) => e.includes('Blocked request to private IP address')),
            );
        } finally {
            process.env.BLOCK_PRIVATE_IP = original;
        }
    });

    it('blocks IPv6 link-local when BLOCK_PRIVATE_IP=true', async () => {
        const original = process.env.BLOCK_PRIVATE_IP;
        process.env.BLOCK_PRIVATE_IP = 'true';
        try {
            const v = new FakeValidator();
            await HttpRequestBlock.validate(v, baseRef({ url: 'http://[fe80::1]/' }));
            assert.isTrue(
                v.errors.some((e) => e.includes('Blocked request to private IP address')),
            );
        } finally {
            process.env.BLOCK_PRIVATE_IP = original;
        }
    });

    it('does not block private IPs when BLOCK_PRIVATE_IP=false', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, baseRef({ url: 'http://10.0.0.5/' }));
        assert.isFalse(
            v.errors.some((e) => e.includes('Blocked request to private IP address')),
        );
    });
});
