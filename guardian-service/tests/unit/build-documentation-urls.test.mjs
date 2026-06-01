import assert from 'node:assert/strict';
import { buildDocumentationUrls } from '../../dist/policy-engine/helpers/build-documentation-urls.js';

function entry(overrides = {}) {
    return {
        name: 'Create report',
        description: '',
        target: 'block_tag',
        method: 'POST',
        alias: 'monitoring-reports/create',
        url: '',
        dmrvUrl: '',
        ...overrides,
    };
}

describe('buildDocumentationUrls', () => {
    it('returns an empty array when entries is undefined', () => {
        assert.deepEqual(buildDocumentationUrls('p1', undefined), []);
    });

    it('returns an empty array when entries is null', () => {
        assert.deepEqual(buildDocumentationUrls('p1', null), []);
    });

    it('returns an empty array when entries is not an array', () => {
        assert.deepEqual(buildDocumentationUrls('p1', {}), []);
    });

    it('returns an empty array for an empty list', () => {
        assert.deepEqual(buildDocumentationUrls('p1', []), []);
    });

    it('builds the technical url from policyId and target tag', () => {
        const [out] = buildDocumentationUrls('pol-123', [entry({ target: 'tagA', alias: 'create' })]);
        assert.equal(out.url, '/api/v1/policies/pol-123/tag/tagA/blocks');
    });

    it('builds the dmrv url from policyId and alias', () => {
        const [out] = buildDocumentationUrls('pol-123', [entry({ alias: 'monitoring-reports/create' })]);
        assert.equal(out.dmrvUrl, '/api/v1/dmrv/pol-123/monitoring-reports/create');
    });

    it('preserves the original entry fields', () => {
        const [out] = buildDocumentationUrls('p1', [entry({ name: 'N', description: 'D', method: 'GET', target: 't', alias: 'a' })]);
        assert.equal(out.name, 'N');
        assert.equal(out.description, 'D');
        assert.equal(out.method, 'GET');
        assert.equal(out.target, 't');
        assert.equal(out.alias, 'a');
    });

    it('accepts a flat single-segment alias', () => {
        const [out] = buildDocumentationUrls('p1', [entry({ alias: 'create' })]);
        assert.equal(out.dmrvUrl, '/api/v1/dmrv/p1/create');
    });

    it('accepts a nested multi-segment alias', () => {
        const [out] = buildDocumentationUrls('p1', [entry({ alias: 'a/b/c' })]);
        assert.equal(out.dmrvUrl, '/api/v1/dmrv/p1/a/b/c');
    });

    it('maps every entry in a multi-entry list', () => {
        const out = buildDocumentationUrls('p1', [
            entry({ target: 't1', alias: 'one' }),
            entry({ target: 't2', alias: 'two' }),
        ]);
        assert.equal(out.length, 2);
        assert.equal(out[0].dmrvUrl, '/api/v1/dmrv/p1/one');
        assert.equal(out[1].url, '/api/v1/policies/p1/tag/t2/blocks');
    });

    it('throws on an uppercase alias', () => {
        assert.throws(() => buildDocumentationUrls('p1', [entry({ alias: 'Create' })]), /Invalid alias/);
    });

    it('throws on a double-slash alias', () => {
        assert.throws(() => buildDocumentationUrls('p1', [entry({ alias: 'a//b' })]), /Invalid alias/);
    });

    it('throws on a leading-slash alias', () => {
        assert.throws(() => buildDocumentationUrls('p1', [entry({ alias: '/a' })]), /Invalid alias/);
    });

    it('throws on an alias with spaces', () => {
        assert.throws(() => buildDocumentationUrls('p1', [entry({ alias: 'a b' })]), /Invalid alias/);
    });

    it('throws on an empty alias', () => {
        assert.throws(() => buildDocumentationUrls('p1', [entry({ alias: '' })]), /Invalid alias/);
    });

    it('does not mutate the input entry', () => {
        const input = entry({ alias: 'create', url: '', dmrvUrl: '' });
        buildDocumentationUrls('p1', [input]);
        assert.equal(input.url, '');
        assert.equal(input.dmrvUrl, '');
    });
});
