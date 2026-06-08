import assert from 'node:assert/strict';
import { findOptions } from '../../../dist/policy-engine/helpers/find-options.js';

describe('findOptions', () => {
    it('returns null for null/undefined document', () => {
        assert.equal(findOptions(null, 'foo'), null);
        assert.equal(findOptions(undefined, 'foo'), null);
    });

    it('returns null when field is empty/falsy', () => {
        assert.equal(findOptions({ foo: 'bar' }, null), null);
        assert.equal(findOptions({ foo: 'bar' }, ''), null);
    });

    it('reads a top-level field', () => {
        assert.equal(findOptions({ foo: 'bar' }, 'foo'), 'bar');
    });

    it('walks a dotted path', () => {
        const doc = { a: { b: { c: 42 } } };
        assert.equal(findOptions(doc, 'a.b.c'), 42);
    });

    it('throws when an intermediate key is missing (no defensive null-walk)', () => {
        const doc = { a: { b: 1 } };
        assert.throws(() => findOptions(doc, 'a.x.y'), /Cannot read properties/);
    });

    it('"L" segment returns the last array element', () => {
        const doc = { items: [{ v: 1 }, { v: 2 }, { v: 3 }] };
        assert.deepEqual(findOptions(doc, 'items.L'), { v: 3 });
        assert.equal(findOptions(doc, 'items.L.v'), 3);
    });

    it('"L" on a non-array reads the literal "L" property', () => {
        const doc = { items: { L: 'literal' } };
        assert.equal(findOptions(doc, 'items.L'), 'literal');
    });

    it('returns the value as-is when it is non-string/object (number, bool, null)', () => {
        assert.equal(findOptions({ n: 0 }, 'n'), 0);
        assert.equal(findOptions({ b: false }, 'b'), false);
        assert.equal(findOptions({ x: null }, 'x'), null);
    });
});
