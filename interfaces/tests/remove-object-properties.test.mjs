import assert from 'node:assert/strict';
import { removeObjectProperties } from '../dist/helpers/remove-object-properties.js';

describe('removeObjectProperties', () => {
    it('removes top-level properties', () => {
        const obj = { keep: 1, drop: 2 };
        removeObjectProperties(['drop'], obj);
        assert.deepEqual(obj, { keep: 1 });
    });

    it('removes properties recursively from nested objects', () => {
        const obj = { keep: 1, child: { keep: 'a', drop: 'b' } };
        removeObjectProperties(['drop'], obj);
        assert.deepEqual(obj, { keep: 1, child: { keep: 'a' } });
    });

    it('walks arrays of objects', () => {
        const obj = [{ drop: 'x', keep: 1 }, { drop: 'y', keep: 2 }];
        removeObjectProperties(['drop'], obj);
        assert.deepEqual(obj, [{ keep: 1 }, { keep: 2 }]);
    });

    it('returns the input untouched when properties is not an array', () => {
        const obj = { drop: 1 };
        const result = removeObjectProperties('drop', obj);
        assert.deepEqual(result, { drop: 1 });
    });

    it('returns the input when obj is null/undefined', () => {
        assert.equal(removeObjectProperties(['x'], null), null);
        assert.equal(removeObjectProperties(['x'], undefined), undefined);
    });

    it('removes multiple properties in one pass', () => {
        const obj = { a: 1, b: 2, c: 3 };
        removeObjectProperties(['a', 'c'], obj);
        assert.deepEqual(obj, { b: 2 });
    });
});
