import assert from 'node:assert/strict';
import { findOptions } from '../../../dist/policy-engine/helpers/find-options.js';
import { setOptions } from '../../../dist/policy-engine/helpers/set-options.js';
import { GetOtherOptions } from '../../../dist/policy-engine/helpers/get-other-options.js';
import { PolicyBlockDefaultOptions } from '../../../dist/policy-engine/helpers/policy-block-default-options.js';

describe('findOptions', () => {
    it('reads a top-level field', () => {
        assert.equal(findOptions({ a: 1 }, 'a'), 1);
    });

    it('reads a nested field via dotted path', () => {
        assert.equal(findOptions({ a: { b: { c: 'x' } } }, 'a.b.c'), 'x');
    });

    it('returns undefined when a path step is missing', () => {
        assert.equal(findOptions({ a: { b: 1 } }, 'a.b.c'), undefined);
    });

    it('uses the "L" segment to read the last element of an array', () => {
        assert.equal(findOptions({ list: [{ v: 1 }, { v: 2 }, { v: 3 }] }, 'list.L.v'), 3);
    });

    it('returns null when the document is null', () => {
        assert.equal(findOptions(null, 'a'), null);
    });

    it('returns null when the field is empty', () => {
        assert.equal(findOptions({ a: 1 }, ''), null);
    });
});

describe('setOptions', () => {
    it('sets a top-level field', () => {
        const data = {};
        setOptions(data, 'a', 7);
        assert.deepEqual(data, { a: 7 });
    });

    it('creates intermediate objects for a nested path', () => {
        const data = {};
        setOptions(data, 'a.b.c', 'x');
        assert.deepEqual(data, { a: { b: { c: 'x' } } });
    });

    it('overwrites an existing nested value', () => {
        const data = { a: { b: 1 } };
        setOptions(data, 'a.b', 2);
        assert.equal(data.a.b, 2);
    });

    it('writes into the last element when "L" is used on a non-empty array', () => {
        const data = { list: [{}, { existing: true }] };
        setOptions(data, 'list.L.v', 9);
        assert.equal(data.list[1].v, 9);
        assert.equal(data.list[1].existing, true);
    });

    it('appends an empty object when "L" is used on an empty array', () => {
        const data = { list: [] };
        setOptions(data, 'list.L.v', 9);
        assert.deepEqual(data.list, [{ v: 9 }]);
    });

    it('throws when assigning a property on a non-object leaf', () => {
        const data = { a: 1 };
        assert.throws(() => setOptions(data, 'a.b', 2), /non object/);
    });

    it('returns the data unchanged when data is null', () => {
        assert.equal(setOptions(null, 'a', 1), null);
    });

    it('returns the data unchanged when field is empty', () => {
        const data = { a: 1 };
        const out = setOptions(data, '', 9);
        assert.deepEqual(out, { a: 1 });
    });
});

describe('GetOtherOptions', () => {
    it('strips internal/known fields and keeps the rest', () => {
        const input = {
            blockType: 'x',
            commonBlock: true,
            tag: 't',
            defaultActive: false,
            permissions: [],
            blockMap: {},
            tagMap: {},
            _uuid: 'u',
            _parent: { id: 1 },
            baseClass: 'B',
            customA: 1,
            customB: { nested: 'v' },
        };
        assert.deepEqual(GetOtherOptions(input), { customA: 1, customB: { nested: 'v' } });
    });

    it('returns an empty object when only stripped fields are present', () => {
        assert.deepEqual(
            GetOtherOptions({ blockType: 'x', commonBlock: true, _uuid: 'u' }),
            {}
        );
    });

    it('deep-clones the remaining fields (no shared references)', () => {
        const inner = { v: 1 };
        const out = GetOtherOptions({ blockType: 'x', nested: inner });
        assert.deepEqual(out.nested, { v: 1 });
        assert.notEqual(out.nested, inner);
    });
});

describe('PolicyBlockDefaultOptions', () => {
    it('returns the documented defaults', () => {
        assert.deepEqual(PolicyBlockDefaultOptions(), {
            commonBlock: false,
            tag: null,
            defaultActive: false,
            permissions: [],
            _parent: null,
        });
    });

    it('returns a fresh object on each call', () => {
        const a = PolicyBlockDefaultOptions();
        const b = PolicyBlockDefaultOptions();
        assert.notEqual(a, b);
        a.permissions.push('mutated');
        assert.deepEqual(b.permissions, []);
    });
});
