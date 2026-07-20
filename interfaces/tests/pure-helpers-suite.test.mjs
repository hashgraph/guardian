import assert from 'node:assert/strict';
import { sortObjectsArray } from '../dist/helpers/sort-objects-array.js';
import { removeObjectProperties } from '../dist/helpers/remove-object-properties.js';
import { GenerateUUIDv4, GenerateID } from '../dist/helpers/generate-uuid-v4.js';
import { OrderDirection } from '../dist/type/index.js';

describe('sortObjectsArray', () => {
    const mk = () => [{ n: 3 }, { n: 1 }, { n: 2 }];

    it('sorts ascending by default', () => {
        assert.deepEqual(sortObjectsArray(mk(), 'n').map((x) => x.n), [1, 2, 3]);
    });

    it('sorts ascending when ASC is explicit', () => {
        assert.deepEqual(sortObjectsArray(mk(), 'n', OrderDirection.ASC).map((x) => x.n), [1, 2, 3]);
    });

    it('sorts descending with DESC', () => {
        assert.deepEqual(sortObjectsArray(mk(), 'n', OrderDirection.DESC).map((x) => x.n), [3, 2, 1]);
    });

    it('handles negative numbers', () => {
        const r = sortObjectsArray([{ n: -1 }, { n: -5 }, { n: 2 }], 'n');
        assert.deepEqual(r.map((x) => x.n), [-5, -1, 2]);
    });

    it('preserves floating point ordering', () => {
        const r = sortObjectsArray([{ n: 0.3 }, { n: 0.1 }, { n: 0.2 }], 'n');
        assert.deepEqual(r.map((x) => x.n), [0.1, 0.2, 0.3]);
    });

    it('returns an empty array unchanged', () => {
        assert.deepEqual(sortObjectsArray([], 'n'), []);
    });

    it('only reorders by the named field, leaving objects intact', () => {
        const r = sortObjectsArray([{ n: 2, tag: 'b' }, { n: 1, tag: 'a' }], 'n');
        assert.deepEqual(r, [{ n: 1, tag: 'a' }, { n: 2, tag: 'b' }]);
    });

    it('sorts in place and returns the same array reference', () => {
        const arr = mk();
        assert.equal(sortObjectsArray(arr, 'n'), arr);
    });

    it('keeps equal-keyed elements together', () => {
        const r = sortObjectsArray([{ n: 1, k: 'a' }, { n: 1, k: 'b' }, { n: 0, k: 'c' }], 'n');
        assert.equal(r[0].n, 0);
        assert.equal(r[1].n, 1);
        assert.equal(r[2].n, 1);
    });
});

describe('removeObjectProperties', () => {
    it('removes a top-level property', () => {
        assert.deepEqual(removeObjectProperties(['a'], { a: 1, b: 2 }), { b: 2 });
    });

    it('removes multiple named properties', () => {
        assert.deepEqual(removeObjectProperties(['a', 'c'], { a: 1, b: 2, c: 3 }), { b: 2 });
    });

    it('returns a null object untouched', () => {
        assert.equal(removeObjectProperties(['a'], null), null);
    });

    it('returns the object untouched when names is not an array', () => {
        const obj = { a: 1 };
        assert.equal(removeObjectProperties('a', obj), obj);
        assert.deepEqual(obj, { a: 1 });
    });

    it('an empty names array leaves the object unchanged', () => {
        assert.deepEqual(removeObjectProperties([], { a: 1 }), { a: 1 });
    });

    it('removes nested properties recursively', () => {
        const obj = { a: 1, child: { a: 2, keep: 5 } };
        assert.deepEqual(removeObjectProperties(['a'], obj), { child: { keep: 5 } });
    });

    it('removes the property from every element of an array value', () => {
        const obj = { list: [{ a: 1, k: 1 }, { a: 2, k: 2 }] };
        assert.deepEqual(removeObjectProperties(['a'], obj), { list: [{ k: 1 }, { k: 2 }] });
    });

    it('removes from a deeply nested structure', () => {
        const obj = { x: { y: { z: { secret: 1, keep: 2 } } } };
        assert.deepEqual(removeObjectProperties(['secret'], obj), { x: { y: { z: { keep: 2 } } } });
    });

    it('mutates and returns the same reference', () => {
        const obj = { a: 1, b: 2 };
        assert.equal(removeObjectProperties(['a'], obj), obj);
    });
});

describe('GenerateUUIDv4', () => {
    const RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it('produces an RFC 4122 v4 formatted string', () => {
        assert.match(GenerateUUIDv4(), RE);
    });

    it('the version nibble is 4 and the variant nibble is one of 8/9/a/b', () => {
        const parts = GenerateUUIDv4().split('-');
        assert.equal(parts[2][0], '4');
        assert.ok(['8', '9', 'a', 'b'].includes(parts[3][0].toLowerCase()));
    });

    it('produces unique values across many calls', () => {
        const set = new Set();
        for (let i = 0; i < 500; i++) {
            set.add(GenerateUUIDv4());
        }
        assert.equal(set.size, 500);
    });
});

describe('GenerateID', () => {
    it('produces a 32-character lowercase hex string', () => {
        const id = GenerateID();
        assert.equal(id.length, 32);
        assert.match(id, /^[0-9a-f]{32}$/);
    });

    it('produces unique values across many calls', () => {
        const set = new Set();
        for (let i = 0; i < 500; i++) {
            set.add(GenerateID());
        }
        assert.equal(set.size, 500);
    });
});
