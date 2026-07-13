import assert from 'node:assert/strict';
import { sortObjectsArray } from '../dist/helpers/sort-objects-array.js';

describe('sortObjectsArray', () => {
    it('sorts ascending by default', () => {
        const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
        const result = sortObjectsArray(items, 'n');
        assert.deepEqual(result.map((i) => i.n), [1, 2, 3]);
    });

    it('sorts descending when direction=DESC', () => {
        const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
        const result = sortObjectsArray(items, 'n', 'DESC');
        assert.deepEqual(result.map((i) => i.n), [3, 2, 1]);
    });

    it('mutates the input array (in-place sort)', () => {
        const items = [{ n: 2 }, { n: 1 }];
        const result = sortObjectsArray(items, 'n');
        assert.equal(result, items);
    });

    it('returns an empty array when input is empty', () => {
        assert.deepEqual(sortObjectsArray([], 'n'), []);
    });

    it('handles single-element arrays as a no-op', () => {
        const items = [{ n: 42 }];
        assert.deepEqual(sortObjectsArray(items, 'n'), [{ n: 42 }]);
    });
});
