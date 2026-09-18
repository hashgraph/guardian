import assert from 'node:assert/strict';
import { SchemaCache } from '../../dist/helpers/import-helpers/common/load-helper.js';
import { onlyUnique } from '../../dist/helpers/import-helpers/schema/schema-helper.js';

describe('SchemaCache', () => {
    it('reports false for an unknown id', () => {
        assert.equal(SchemaCache.hasSchema('cache-missing-id'), false);
    });

    it('stores and retrieves a schema by id', () => {
        SchemaCache.setSchema('cache-id-1', { iri: '#a', value: 1 });
        assert.equal(SchemaCache.hasSchema('cache-id-1'), true);
        assert.deepEqual(SchemaCache.getSchema('cache-id-1'), { iri: '#a', value: 1 });
    });

    it('returns a deep copy, not the original reference', () => {
        const original = { nested: { x: 1 } };
        SchemaCache.setSchema('cache-id-2', original);
        const fetched = SchemaCache.getSchema('cache-id-2');
        assert.notEqual(fetched, original);
        fetched.nested.x = 99;
        assert.equal(SchemaCache.getSchema('cache-id-2').nested.x, 1);
    });

    it('returns null when getting an unknown id', () => {
        assert.equal(SchemaCache.getSchema('cache-never-set'), null);
    });

    it('overwrites an existing entry', () => {
        SchemaCache.setSchema('cache-id-3', { v: 'first' });
        SchemaCache.setSchema('cache-id-3', { v: 'second' });
        assert.deepEqual(SchemaCache.getSchema('cache-id-3'), { v: 'second' });
    });

    it('ignores non-serialisable values on set', () => {
        const circular = {};
        circular.self = circular;
        SchemaCache.setSchema('cache-circular', circular);
        assert.equal(SchemaCache.getSchema('cache-circular'), null);
    });
});

describe('onlyUnique', () => {
    it('filters duplicate primitives out of an array', () => {
        assert.deepEqual([1, 1, 2, 3, 3, 3].filter(onlyUnique), [1, 2, 3]);
    });

    it('keeps the first occurrence of each string', () => {
        assert.deepEqual(['a', 'b', 'a', 'c', 'b'].filter(onlyUnique), ['a', 'b', 'c']);
    });

    it('returns true only at the first matching index', () => {
        const arr = ['x', 'x'];
        assert.equal(onlyUnique('x', 0, arr), true);
        assert.equal(onlyUnique('x', 1, arr), false);
    });

    it('handles an empty array', () => {
        assert.deepEqual([].filter(onlyUnique), []);
    });

    it('leaves an already-unique array unchanged', () => {
        assert.deepEqual([1, 2, 3].filter(onlyUnique), [1, 2, 3]);
    });
});
