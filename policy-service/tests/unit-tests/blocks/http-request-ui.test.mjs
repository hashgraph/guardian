import { assert } from 'chai';
import { HttpRequestUIAddon } from '../../../dist/policy-engine/block-validators/blocks/http-request-ui-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (overrides = {}) => ({
    options: { url: 'https://example.com', method: 'get', ...overrides },
    children: [],
});

describe('HttpRequestUIAddon.validate', () => {
    it('passes a basic config', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });

    it('rejects empty url', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, refWith({ url: '' }));
        assert.include(v.errors, 'Url can not be empty');
    });

    it('rejects malformed url', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, refWith({ url: 'not a url' }));
        assert.include(v.errors, '"Url" is not valid');
    });

    it('rejects unknown method', async () => {
        const v = new FakeValidator();
        await HttpRequestUIAddon.validate(v, refWith({ method: 'patch' }));
        assert.match(v.errors[0], /must be one of get\|post\|put/);
    });

    it('accepts get / post / put', async () => {
        for (const method of ['get', 'post', 'put']) {
            const v = new FakeValidator();
            await HttpRequestUIAddon.validate(v, refWith({ method }));
            assert.deepEqual(v.errors, [], `method=${method} unexpectedly failed`);
        }
    });
});
