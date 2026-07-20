import { assert } from 'chai';
import { HttpRequestUIAddon } from '../../../dist/policy-engine/block-validators/blocks/http-request-ui-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('HttpRequestUIAddon.validate', () => {
    it('exposes blockType "httpRequestUIAddon"', () => {
        assert.equal(HttpRequestUIAddon.blockType, 'httpRequestUIAddon');
    });

    it('rejects empty url', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, { options: { method: 'get' } });
        assert.include(v.errors, 'Url can not be empty');
    });

    it('rejects malformed url', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, { options: { url: 'not a url', method: 'get' } });
        assert.include(v.errors, '"Url" is not valid');
    });

    it('rejects unknown method', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, { options: { url: 'https://x', method: 'delete' } });
        assert.include(v.errors, 'Option "method" must be one of get|post|put');
    });

    it('passes for url + valid method', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, { options: { url: 'https://x', method: 'post' } });
        assert.deepEqual(v.errors, []);
    });
});
