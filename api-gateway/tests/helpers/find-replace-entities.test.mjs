import assert from 'node:assert/strict';
import { findAllEntities, replaceAllEntities } from '../../dist/helpers/utils.js';

describe('findAllEntities (api-gateway)', () => {
    it('returns deduplicated values found at the named field across the children tree', () => {
        const tree = {
            name: 'a',
            children: [
                { name: 'b' },
                { name: 'a', children: [{ name: 'c' }] },
            ],
        };
        const result = findAllEntities(tree, 'name').sort();
        assert.deepEqual(result, ['a', 'b', 'c']);
    });

    it('returns [] when the named field is absent everywhere', () => {
        const tree = { children: [{ children: [{}] }] };
        assert.deepEqual(findAllEntities(tree, 'tag'), []);
    });

    it('returns [] for null/undefined input', () => {
        assert.deepEqual(findAllEntities(null, 'name'), []);
        assert.deepEqual(findAllEntities(undefined, 'name'), []);
    });
});

describe('replaceAllEntities (api-gateway)', () => {
    it('rewrites only matching values at the named field, preserving others', () => {
        const tree = {
            name: 'old',
            children: [
                { name: 'old' },
                { name: 'keep', children: [{ name: 'old' }] },
            ],
        };
        replaceAllEntities(tree, 'name', 'old', 'new');
        assert.equal(tree.name, 'new');
        assert.equal(tree.children[0].name, 'new');
        assert.equal(tree.children[1].name, 'keep');
        assert.equal(tree.children[1].children[0].name, 'new');
    });

    it('is a no-op when no values match', () => {
        const tree = { name: 'a', children: [{ name: 'b' }] };
        replaceAllEntities(tree, 'name', 'zz', 'new');
        assert.equal(tree.name, 'a');
        assert.equal(tree.children[0].name, 'b');
    });
});
