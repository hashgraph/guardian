import assert from 'node:assert/strict';
import { BaseIntegrationService } from '../../../dist/integrations/base-integration-service.js';

const method = (overrides = {}) => ({
    method: 'GET',
    endpoint: '/items',
    description: 'list items',
    ...overrides,
});

describe('BaseIntegrationService.getBaseUrl / getAvailableMethods', () => {
    it('returns "" by default for getBaseUrl', () => {
        assert.equal(BaseIntegrationService.getBaseUrl(), '');
    });

    it('returns {} by default for getAvailableMethods', () => {
        assert.deepEqual(BaseIntegrationService.getAvailableMethods(), {});
    });
});

describe('BaseIntegrationService.getDataForRequest — endpoint substitution', () => {
    it('throws when method is null', () => {
        assert.throws(() => BaseIntegrationService.getDataForRequest(null), /Unsupported method/);
    });

    it('substitutes :name path placeholders from params', () => {
        const out = BaseIntegrationService.getDataForRequest(
            method({ endpoint: '/items/:id/status/:state' }),
            { id: 'abc', state: 'open' }
        );
        assert.equal(out.url, '/items/abc/status/open');
    });

    it('URL-encodes path values', () => {
        const out = BaseIntegrationService.getDataForRequest(
            method({ endpoint: '/items/:name' }),
            { name: 'a b/c' }
        );
        assert.equal(out.url, '/items/a%20b%2Fc');
    });

    it('throws when a required path placeholder is missing', () => {
        const m = method({
            endpoint: '/items/:id',
            parameters: { path: { id: { required: true, name: 'id', value: '' } } },
        });
        assert.throws(
            () => BaseIntegrationService.getDataForRequest(m, {}),
            /Missing required path parameter: "id"/,
        );
    });

    it('omits a missing optional path placeholder (replaces with "")', () => {
        const m = method({ endpoint: '/items/:id' });
        const out = BaseIntegrationService.getDataForRequest(m, {});
        // After encoding empty + collapsing the trailing dup slash, the URL is "/items/".
        assert.equal(out.url, '/items/');
    });

    it('skips substitution for the named paramNameForSkipReplace', () => {
        const out = BaseIntegrationService.getDataForRequest(
            method({ endpoint: '/items/:id/:placeholder' }),
            { id: 'abc' },
            false,
            'placeholder',
        );
        assert.equal(out.url, '/items/abc/:placeholder');
    });

    it('collapses // to / in the rendered endpoint', () => {
        const out = BaseIntegrationService.getDataForRequest(
            method({ endpoint: '/items//:id' }),
            { id: 'abc' }
        );
        assert.equal(out.url.includes('//'), false);
    });
});

describe('BaseIntegrationService.getDataForRequest — query params', () => {
    it('forwards optional query params from the input', () => {
        const m = method({
            parameters: { query: { sort: { name: 'sort', value: '' } } },
        });
        const out = BaseIntegrationService.getDataForRequest(m, { sort: 'desc' });
        assert.equal(out.params.sort, 'desc');
    });

    it('skips query params that are not provided', () => {
        const m = method({
            parameters: { query: { sort: { name: 'sort', value: '' } } },
        });
        const out = BaseIntegrationService.getDataForRequest(m, {});
        assert.equal(out.params.sort, undefined);
    });

    it('throws when a required query param is missing', () => {
        const m = method({
            parameters: { query: { sort: { name: 'sort', value: '', required: true } } },
        });
        assert.throws(
            () => BaseIntegrationService.getDataForRequest(m, {}),
            /Missing required path parameter: "sort"/,
        );
    });

    it('merges additionalParams into the params object', () => {
        const m = method();
        const out = BaseIntegrationService.getDataForRequest(m, {}, false, '', { traceId: 't-1' });
        assert.equal(out.params.traceId, 't-1');
    });
});

describe('BaseIntegrationService.getDataForRequest — body params', () => {
    const POST = (overrides = {}) => method({ method: 'POST', endpoint: '/items', ...overrides });

    it('passes string body fields through', () => {
        const m = POST({
            parameters: { body: { name: { name: 'name', value: '' } } },
        });
        const out = BaseIntegrationService.getDataForRequest(m, { name: 'x' });
        assert.deepEqual(out.data, { name: 'x' });
    });

    it('parses NUMBER body fields with Number()', () => {
        const m = POST({
            parameters: { body: { age: { name: 'age', value: '', parseType: 'NUMBER' } } },
        });
        const out = BaseIntegrationService.getDataForRequest(m, { age: '42' });
        assert.equal(out.data.age, 42);
    });

    it('parses JSON body fields with JSON.parse()', () => {
        const m = POST({
            parameters: { body: { meta: { name: 'meta', value: '', parseType: 'JSON' } } },
        });
        const out = BaseIntegrationService.getDataForRequest(m, { meta: '{"k":1}' });
        assert.deepEqual(out.data.meta, { k: 1 });
    });

    it('throws when a required body field is missing', () => {
        const m = POST({
            parameters: { body: { name: { name: 'name', value: '', required: true } } },
        });
        assert.throws(
            () => BaseIntegrationService.getDataForRequest(m, {}),
            /Missing required bodyField parameter: "name"/,
        );
    });

    it('omits the data field for GET requests', () => {
        const m = method({
            method: 'GET',
            parameters: { body: { name: { name: 'name', value: '' } } },
        });
        const out = BaseIntegrationService.getDataForRequest(m, { name: 'x' });
        assert.equal(out.data, undefined);
    });
});

describe('BaseIntegrationService.getDataForRequest — fullUrl', () => {
    it('prepends the base URL when fullUrl=true and getBaseUrl returns a value', () => {
        class Sub extends BaseIntegrationService {
            static getBaseUrl() { return 'https://api.example.com'; }
        }
        const out = Sub.getDataForRequest(method({ endpoint: '/items' }), {}, true);
        assert.equal(out.url, 'https://api.example.com/items');
    });

    it('uses the relative endpoint when fullUrl=false', () => {
        class Sub extends BaseIntegrationService {
            static getBaseUrl() { return 'https://api.example.com'; }
        }
        const out = Sub.getDataForRequest(method({ endpoint: '/items' }), {}, false);
        assert.equal(out.url, '/items');
    });
});
