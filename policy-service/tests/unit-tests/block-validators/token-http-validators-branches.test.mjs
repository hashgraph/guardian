import { assert } from 'chai';
import { TokenType } from '@guardian/interfaces';
import { CreateTokenBlock } from '../../../dist/policy-engine/block-validators/blocks/create-token-block.js';
import { HttpRequestBlock } from '../../../dist/policy-engine/block-validators/blocks/http-request-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._tokenTemplate = ('tokenTemplate' in opts) ? opts.tokenTemplate : {};
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    getTokenTemplate() { return this._tokenTemplate; }
}

const ref = (options = {}) => ({ options, children: [] });
const has = (v, sub) => v.errors.some(e => typeof e === 'string' && e.includes(sub));
const countOf = (v, sub) => v.errors.filter(e => typeof e === 'string' && e.includes(sub)).length;

describe('CreateTokenBlock.validate branches', () => {
    it('blockType is createTokenBlock', () => {
        assert.equal(CreateTokenBlock.blockType, 'createTokenBlock');
    });
    it('_isEmpty returns true for null and undefined only', () => {
        assert.isTrue(CreateTokenBlock._isEmpty(null));
        assert.isTrue(CreateTokenBlock._isEmpty(undefined));
        assert.isFalse(CreateTokenBlock._isEmpty(''));
        assert.isFalse(CreateTokenBlock._isEmpty(0));
        assert.isFalse(CreateTokenBlock._isEmpty(false));
    });
    it('missing template adds error', async () => {
        const v = new FakeValidator();
        await CreateTokenBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Template can not be empty'));
    });
    it('autorun with defaultActive adds error', async () => {
        const v = new FakeValidator();
        await CreateTokenBlock.validate(v, ref({ template: 't', autorun: true, defaultActive: true }));
        assert.isTrue(has(v, `Autorun can't be use with default active`));
    });
    it('missing token template adds does-not-exist error', async () => {
        const v = new FakeValidator({ tokenTemplate: null });
        await CreateTokenBlock.validate(v, ref({ template: 't' }));
        assert.isTrue(has(v, 'Token "t" does not exist'));
    });
    it('autorun with empty template fields accumulates errors', async () => {
        const v = new FakeValidator({ tokenTemplate: {} });
        await CreateTokenBlock.validate(v, ref({ template: 't', autorun: true }));
        assert.isTrue(countOf(v, 'Autorun requires all fields to be filled') >= 1);
    });
    it('autorun fungible without decimals flags missing field', async () => {
        const v = new FakeValidator({ tokenTemplate: {
            tokenType: TokenType.FUNGIBLE, tokenName: 'n', tokenSymbol: 's',
            enableAdmin: true, enableWipe: false, enableKYC: true, enableFreeze: true
        } });
        await CreateTokenBlock.validate(v, ref({ template: 't', autorun: true }));
        assert.isTrue(has(v, 'Autorun requires all fields to be filled'));
    });
    it('autorun with fully-filled non-fungible template yields no errors', async () => {
        const v = new FakeValidator({ tokenTemplate: {
            tokenType: 'non-fungible', tokenName: 'n', tokenSymbol: 's',
            enableAdmin: true, enableWipe: false, enableKYC: true, enableFreeze: true
        } });
        await CreateTokenBlock.validate(v, ref({ template: 't', autorun: true }));
        assert.deepEqual(v.errors, []);
    });
    it('non-autorun with existing template yields no errors', async () => {
        const v = new FakeValidator({ tokenTemplate: {} });
        await CreateTokenBlock.validate(v, ref({ template: 't' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('HttpRequestBlock static helpers', () => {
    it('blockType is httpRequestBlock', () => {
        assert.equal(HttpRequestBlock.blockType, 'httpRequestBlock');
    });
    it('isPrivateIP detects 10.x as private', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('10.0.0.5', 4));
    });
    it('isPrivateIP detects 192.168.x as private', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('192.168.1.1', 4));
    });
    it('isPrivateIP detects 172.16-31 as private', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('172.20.0.1', 4));
    });
    it('isPrivateIP detects loopback as private', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('127.0.0.1', 4));
    });
    it('isPrivateIP detects link-local as private', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('169.254.1.1', 4));
    });
    it('isPrivateIP returns false for public IPv4', () => {
        assert.isFalse(HttpRequestBlock.isPrivateIP('8.8.8.8', 4));
    });
    it('isPrivateIP returns false for malformed IPv4', () => {
        assert.isFalse(HttpRequestBlock.isPrivateIP('not.an.ip.addr', 4));
    });
    it('isPrivateIP detects IPv6 loopback', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('::1', 6));
    });
    it('isPrivateIP detects IPv6 unique-local fc/fd', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('fd00::1', 6));
    });
    it('isPrivateIP detects IPv6 link-local fe80', () => {
        assert.isTrue(HttpRequestBlock.isPrivateIP('fe80::1', 6));
    });
    it('isPrivateIP returns false for public IPv6', () => {
        assert.isFalse(HttpRequestBlock.isPrivateIP('2001:4860:4860::8888', 6));
    });
    it('isPrivateIP returns false for unknown family', () => {
        assert.isFalse(HttpRequestBlock.isPrivateIP('1.2.3.4', 0));
    });

    describe('validateProtocol', () => {
        const prev = process.env.ALLOWED_PROTOCOLS;
        afterEach(() => { process.env.ALLOWED_PROTOCOLS = prev; });
        it('throws when ALLOWED_PROTOCOLS not set', () => {
            delete process.env.ALLOWED_PROTOCOLS;
            assert.throws(() => HttpRequestBlock.validateProtocol('https://x.com'), /no allowed protocols/);
        });
        it('throws when protocol not in allowed list', () => {
            process.env.ALLOWED_PROTOCOLS = 'https';
            assert.throws(() => HttpRequestBlock.validateProtocol('http://x.com'), /is not allowed/);
        });
        it('passes when protocol is allowed', () => {
            process.env.ALLOWED_PROTOCOLS = 'https,http';
            assert.doesNotThrow(() => HttpRequestBlock.validateProtocol('https://x.com'));
        });
    });
});

describe('HttpRequestBlock.validate branches', () => {
    const prev = process.env.ALLOWED_PROTOCOLS;
    const prevBlock = process.env.BLOCK_PRIVATE_IP;
    beforeEach(() => { process.env.ALLOWED_PROTOCOLS = 'https,http'; process.env.BLOCK_PRIVATE_IP = 'false'; });
    afterEach(() => { process.env.ALLOWED_PROTOCOLS = prev; process.env.BLOCK_PRIVATE_IP = prevBlock; });

    it('missing url adds error', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, ref({ method: 'GET', url: 'https://x.com' }));
        const v2 = new FakeValidator();
        await HttpRequestBlock.validate(v2, ref({ method: 'GET', url: '   ' }));
        assert.isTrue(has(v2, 'Option "url" must be set'));
    });
    it('invalid method adds error', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, ref({ method: 'FETCH', url: 'https://x.com' }));
        assert.isTrue(has(v, 'Option "method" must be'));
    });
    for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        it(`method ${m} passes method check`, async () => {
            const v = new FakeValidator();
            await HttpRequestBlock.validate(v, ref({ method: m, url: 'https://x.com' }));
            assert.isFalse(has(v, 'Option "method" must be'));
        });
    }
    it('disallowed protocol url adds error', async () => {
        process.env.ALLOWED_PROTOCOLS = 'https';
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, ref({ method: 'GET', url: 'ftp://x.com' }));
        assert.isTrue(has(v, 'is not allowed'));
    });
    it('valid GET https config yields no errors', async () => {
        const v = new FakeValidator();
        await HttpRequestBlock.validate(v, ref({ method: 'GET', url: 'https://x.com' }));
        assert.deepEqual(v.errors, []);
    });
});
