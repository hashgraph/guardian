import assert from 'node:assert/strict';
import { removeObjectProperties } from '../dist/helpers/remove-object-properties.js';

describe('removeObjectProperties — edge & quirks', () => {
    it('returns the same object reference (mutates in place)', () => {
        const obj = { drop: 1, keep: 2 };
        assert.equal(removeObjectProperties(['drop'], obj), obj);
    });

    it('leaves the object unchanged for an empty properties list', () => {
        const obj = { a: 1, b: { c: 2 } };
        const result = removeObjectProperties([], obj);
        assert.equal(result, obj);
        assert.deepEqual(obj, { a: 1, b: { c: 2 } });
    });

    it('is a no-op when the property does not exist', () => {
        const obj = { a: 1 };
        removeObjectProperties(['missing'], obj);
        assert.deepEqual(obj, { a: 1 });
    });

    it('walks arrays nested inside objects', () => {
        const obj = { list: [{ drop: 1, k: 2 }, { drop: 3, k: 4 }] };
        removeObjectProperties(['drop'], obj);
        assert.deepEqual(obj, { list: [{ k: 2 }, { k: 4 }] });
    });

    it('descends multiple levels deep', () => {
        const obj = { a: { b: { c: { drop: 1, keep: 2 } } } };
        removeObjectProperties(['drop'], obj);
        assert.deepEqual(obj, { a: { b: { c: { keep: 2 } } } });
    });

    it('does not throw on null-valued nested fields', () => {
        const obj = { keep: 1, nested: null, drop: 2 };
        removeObjectProperties(['drop'], obj);
        assert.deepEqual(obj, { keep: 1, nested: null });
    });

    it('does not corrupt Date instances while recursing through them', () => {
        const when = new Date(0);
        const obj = { when, drop: 1 };
        removeObjectProperties(['drop'], obj);
        assert.ok(obj.when instanceof Date);
        assert.equal(obj.when.getTime(), 0);
    });

    it('removes properties keyed by Unicode names', () => {
        const obj = { 'café': 1, drop: 2 };
        removeObjectProperties(['café'], obj);
        assert.deepEqual(obj, { drop: 2 });
    });

    it('returns primitive arguments unchanged', () => {
        assert.equal(removeObjectProperties(['x'], 5), 5);
        assert.equal(removeObjectProperties(['x'], 'hi'), 'hi');
        assert.equal(removeObjectProperties(['x'], true), true);
    });

    it('overflows the stack on a circular reference (no cycle guard)', () => {
        const obj = { a: 1 };
        obj.self = obj;
        assert.throws(() => removeObjectProperties(['a'], obj), RangeError);
    });
});
