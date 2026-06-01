import assert from 'node:assert/strict';
import { setOptions } from '../../../dist/policy-engine/helpers/set-options.js';

describe('setOptions', () => {
    it('sets a top-level field', () => {
        const data = {};
        setOptions(data, 'foo', 42);
        assert.deepEqual(data, { foo: 42 });
    });

    it('mutates and returns the same reference', () => {
        const data = {};
        const out = setOptions(data, 'foo', 1);
        assert.strictEqual(out, data);
    });

    it('creates intermediate objects on a dotted path', () => {
        const data = {};
        setOptions(data, 'a.b.c', 7);
        assert.deepEqual(data, { a: { b: { c: 7 } } });
    });

    it('overwrites an existing leaf value', () => {
        const data = { a: { b: 'old' } };
        setOptions(data, 'a.b', 'new');
        assert.equal(data.a.b, 'new');
    });

    it('returns data unchanged when field is empty/null', () => {
        const data = { x: 1 };
        const out = setOptions(data, '', 'v');
        assert.deepEqual(out, { x: 1 });
        assert.equal(setOptions(data, null, 'v'), data);
    });

    it('returns data unchanged when data is null/undefined', () => {
        assert.equal(setOptions(null, 'a.b', 1), null);
        assert.equal(setOptions(undefined, 'a.b', 1), undefined);
    });

    it('"L" segment writes through the last element of an array', () => {
        const data = { items: [{ v: 1 }] };
        setOptions(data, 'items.L.v', 99);
        assert.equal(data.items[0].v, 99);
    });

    it('"L" on an empty array pushes a new object and writes into it', () => {
        const data = { items: [] };
        setOptions(data, 'items.L.v', 'created');
        assert.equal(data.items.length, 1);
        assert.equal(data.items[0].v, 'created');
    });

    it('"L" replaces a trailing undefined slot with an object before writing', () => {
        const data = { items: [{ v: 1 }, undefined] };
        setOptions(data, 'items.L.v', 'second');
        assert.deepEqual(data.items[1], { v: 'second' });
    });

    it('throws when trying to set a property on a non-object intermediate', () => {
        const data = { a: 'not-an-object' };
        assert.throws(
            () => setOptions(data, 'a.b', 1),
            /Can not set property on non object type/
        );
    });
});
