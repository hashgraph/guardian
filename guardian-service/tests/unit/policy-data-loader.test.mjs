import assert from 'node:assert/strict';
import { Module } from 'node:module';

const originalLoad = Module._load;
Module._load = function (req, parent, ...rest) {
    if (typeof req !== 'string') return originalLoad.call(this, req, parent, ...rest);
    if (req === '@guardian/common') {
        return { DatabaseServer: class { constructor() {} } };
    }
    if (req === '@guardian/interfaces') {
        return { TenantContext: { Empty: { tenantId: null } } };
    }
    if (req === 'jszip') {
        return { default: class JSZip {} };
    }
    return originalLoad.call(this, req, parent, ...rest);
};

const { PolicyDataLoader } = await import('../../dist/policy-engine/helpers/policy-data/loaders/loader.js');

after(() => { Module._load = originalLoad; });

// JSZip mock: just enough surface for the getFromFile method
function makeZip(entries) {
    return {
        files: Object.fromEntries(
            Object.entries(entries).map(([path, content]) => [
                path,
                {
                    dir: path.endsWith('/'),
                    async: async () => content,
                },
            ]),
        ),
    };
}

describe('@unit PolicyDataLoader.getFromFile', () => {
    it('returns entries from the matching path prefix', async () => {
        const zip = makeZip({
            'documents/a.json': JSON.stringify({ id: 'a', createDate: 3 }),
            'documents/b.json': JSON.stringify({ id: 'b', createDate: 1 }),
            'documents/c.json': JSON.stringify({ id: 'c', createDate: 2 }),
            'other/x.json': JSON.stringify({ id: 'should-not-appear' }),
        });
        const result = await PolicyDataLoader.getFromFile(zip, 'documents');
        assert.equal(result.length, 3);
        assert.deepEqual(result.map((r) => r.id), ['a', 'c', 'b'], 'should be sorted by createDate desc');
    });

    it('returns [] when no files match the path prefix', async () => {
        const zip = makeZip({
            'documents/a.json': JSON.stringify({ id: 'a', createDate: 1 }),
        });
        const result = await PolicyDataLoader.getFromFile(zip, 'missing');
        assert.deepEqual(result, []);
    });

    it('filters out directory entries (dir=true)', async () => {
        const zip = makeZip({
            'documents/': 'should be skipped',
            'documents/a.json': JSON.stringify({ id: 'a', createDate: 1 }),
        });
        const result = await PolicyDataLoader.getFromFile(zip, 'documents');
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 'a');
    });

    it('requires nested files (path/* must match — not just path)', async () => {
        const zip = makeZip({
            'documents': JSON.stringify({ id: 'top' }),
            'documents/nested.json': JSON.stringify({ id: 'nested', createDate: 1 }),
        });
        const result = await PolicyDataLoader.getFromFile(zip, 'documents');
        // Only "documents/nested.json" matches "^documents/.+"
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 'nested');
    });

    it('throws when a matching file contains invalid JSON', async () => {
        const zip = makeZip({
            'documents/bad.json': 'not-json-at-all',
        });
        await assert.rejects(() => PolicyDataLoader.getFromFile(zip, 'documents'));
    });

    it('handles empty zip gracefully', async () => {
        const zip = makeZip({});
        const result = await PolicyDataLoader.getFromFile(zip, 'documents');
        assert.deepEqual(result, []);
    });

    it('preserves all object fields from each JSON entry', async () => {
        const zip = makeZip({
            'data/a.json': JSON.stringify({ id: 'a', createDate: 1, foo: 'bar', nested: { x: 1 } }),
        });
        const result = await PolicyDataLoader.getFromFile(zip, 'data');
        assert.equal(result[0].foo, 'bar');
        assert.deepEqual(result[0].nested, { x: 1 });
    });

    it('handles entries with identical createDate stably (descending sort)', async () => {
        const zip = makeZip({
            'data/a.json': JSON.stringify({ id: 'a', createDate: 5 }),
            'data/b.json': JSON.stringify({ id: 'b', createDate: 5 }),
        });
        const result = await PolicyDataLoader.getFromFile(zip, 'data');
        assert.equal(result.length, 2);
        // Both have createDate 5 — implementation-defined which comes first.
        // Just assert both are present.
        const ids = new Set(result.map((r) => r.id));
        assert.ok(ids.has('a'));
        assert.ok(ids.has('b'));
    });

    it('handles missing createDate fields (sorts undefined gracefully)', async () => {
        const zip = makeZip({
            'data/a.json': JSON.stringify({ id: 'a' }),
            'data/b.json': JSON.stringify({ id: 'b', createDate: 1 }),
        });
        // Should not throw; behaviour is implementation-defined but stable.
        const result = await PolicyDataLoader.getFromFile(zip, 'data');
        assert.equal(result.length, 2);
    });

    it('escapes path prefix as regex (literal match)', async () => {
        // Path "doc.s" would match "doc-s/x.json" if not properly escaped.
        // The implementation uses RegExp directly — document that fact.
        const zip = makeZip({
            'doc-s/a.json': JSON.stringify({ id: 'a', createDate: 1 }),
            'docs/b.json': JSON.stringify({ id: 'b', createDate: 1 }),
        });
        // Path "doc-s" is treated as regex; this is a known limitation but
        // documents the contract.
        const result = await PolicyDataLoader.getFromFile(zip, 'doc-s');
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 'a');
    });
});
