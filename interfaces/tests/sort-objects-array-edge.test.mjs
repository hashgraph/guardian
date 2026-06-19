import assert from 'node:assert/strict';
import { sortObjectsArray } from '../dist/helpers/sort-objects-array.js';

describe('sortObjectsArray — edge & quirks', () => {
    it('only treats the exact string "ASC" as ascending; any other value descends', () => {
        const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
        const result = sortObjectsArray(items.map((o) => ({ ...o })), 'n', 'asc');
        assert.deepEqual(result.map((i) => i.n), [3, 2, 1]);
    });

    it('orders negative and floating-point values ascending', () => {
        const items = [{ n: 1.5 }, { n: -2 }, { n: 0 }, { n: -2.5 }];
        const result = sortObjectsArray(items, 'n');
        assert.deepEqual(result.map((i) => i.n), [-2.5, -2, 0, 1.5]);
    });

    it('orders descending including negatives', () => {
        const items = [{ n: -1 }, { n: 5 }, { n: -10 }];
        const result = sortObjectsArray(items, 'n', 'DESC');
        assert.deepEqual(result.map((i) => i.n), [5, -1, -10]);
    });

    it('does not throw and preserves every element when the field is missing on some items', () => {
        const items = [{ n: 2 }, { other: 9 }, { n: 1 }];
        const result = sortObjectsArray(items, 'n');
        assert.equal(result.length, 3);
        assert.equal(result.filter((i) => i.n === 2).length, 1);
        assert.equal(result.filter((i) => i.n === 1).length, 1);
        assert.equal(result.filter((i) => i.other === 9).length, 1);
    });

    it('does not throw and preserves elements for non-numeric field values', () => {
        const items = [{ n: 'banana' }, { n: 'apple' }, { n: 'cherry' }];
        const result = sortObjectsArray(items, 'n');
        assert.equal(result.length, 3);
        assert.deepEqual([...result].map((i) => i.n).sort(), ['apple', 'banana', 'cherry']);
    });

    it('throws a TypeError on a null/undefined array', () => {
        assert.throws(() => sortObjectsArray(null, 'n'), TypeError);
        assert.throws(() => sortObjectsArray(undefined, 'n'), TypeError);
    });
});
