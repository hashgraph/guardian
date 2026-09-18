import { assert } from 'chai';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

describe('@unit PolicyUtils.deepAssign', () => {
    it('throws on null target', () => {
        assert.throws(() => PolicyUtils.deepAssign(null, {}), TypeError);
    });
    it('shallow-copies primitive properties', () => {
        assert.deepEqual(PolicyUtils.deepAssign({}, { a: 1, b: 'x' }), { a: 1, b: 'x' });
    });
    it('deep-merges nested objects', () => {
        const out = PolicyUtils.deepAssign({ a: { x: 1 } }, { a: { y: 2 } });
        assert.deepEqual(out, { a: { x: 1, y: 2 } });
    });
    it('clones arrays (no shared reference)', () => {
        const src = { list: [{ a: 1 }] };
        const out = PolicyUtils.deepAssign({}, src);
        assert.deepEqual(out.list, [{ a: 1 }]);
        assert.notStrictEqual(out.list[0], src.list[0]);
    });
    it('replaces non-object target prop with object when source nested', () => {
        const out = PolicyUtils.deepAssign({ a: 5 }, { a: { z: 1 } });
        assert.deepEqual(out.a, { z: 1 });
    });
    it('ignores non-object sources', () => {
        const out = PolicyUtils.deepAssign({ a: 1 }, 5, 'str', null);
        assert.deepEqual(out, { a: 1 });
    });
    it('later sources override earlier ones', () => {
        assert.deepEqual(PolicyUtils.deepAssign({}, { a: 1 }, { a: 2 }), { a: 2 });
    });
    it('returns the target reference', () => {
        const t = {};
        assert.strictEqual(PolicyUtils.deepAssign(t, { a: 1 }), t);
    });
    it('copies array of primitives', () => {
        assert.deepEqual(PolicyUtils.deepAssign({}, { nums: [1, 2, 3] }), { nums: [1, 2, 3] });
    });
});

describe('@unit PolicyUtils.getVCScope / template delegators', () => {
    it('getVCScope returns first credential subject fields', () => {
        const item = {
            getCredentialSubject: (i) => ({ getFields: () => ({ index: i }) }),
        };
        assert.deepEqual(PolicyUtils.getVCScope(item), { index: 0 });
    });
    it('getTokenTemplate delegates to ref.components', () => {
        const ref = { components: { getTokenTemplate: (n) => ({ n }) } };
        assert.deepEqual(PolicyUtils.getTokenTemplate(ref, 'TK'), { n: 'TK' });
    });
    it('getGroupTemplate delegates to ref.components', () => {
        const ref = { components: { getGroupTemplate: (n) => ({ g: n }) } };
        assert.deepEqual(PolicyUtils.getGroupTemplate(ref, 'G'), { g: 'G' });
    });
    it('getRoleTemplate delegates to ref.components', () => {
        const ref = { components: { getRoleTemplate: (n) => ({ r: n }) } };
        assert.deepEqual(PolicyUtils.getRoleTemplate(ref, 'R'), { r: 'R' });
    });
});

describe('@unit PolicyUtils.autoCalculateField', () => {
    it('evaluates a simple expression against the document', () => {
        const field = { expression: 'a + b', path: 'sum' };
        assert.equal(PolicyUtils.autoCalculateField(field, { a: 2, b: 3 }), 5);
    });
    it('throws Invalid expression on bad expression', () => {
        const field = { expression: 'a +', path: 'broken' };
        assert.throws(() => PolicyUtils.autoCalculateField(field, { a: 1 }), /Invalid expression: broken/);
    });
    it('can reference document fields by name (with scope)', () => {
        const field = { expression: 'price * qty', path: 'total' };
        assert.equal(PolicyUtils.autoCalculateField(field, { price: 4, qty: 2 }), 8);
    });
});

describe('@unit PolicyUtils.autoCalculateFields', () => {
    it('no-op for null/non-object document', () => {
        assert.isUndefined(PolicyUtils.autoCalculateFields([], null));
        assert.isUndefined(PolicyUtils.autoCalculateFields([], 'str'));
        assert.isUndefined(PolicyUtils.autoCalculateFields([], [1, 2]));
    });
    it('sets autocalculated leaf field', () => {
        const doc = { a: 1, b: 2 };
        PolicyUtils.autoCalculateFields([{ name: 'sum', autocalculate: true, expression: 'a + b' }], doc);
        assert.equal(doc.sum, 3);
    });
    it('deletes field when expression yields undefined', () => {
        const doc = { a: 1 };
        PolicyUtils.autoCalculateFields([{ name: 'x', autocalculate: true, expression: 'undefined' }], doc);
        assert.notProperty(doc, 'x');
    });
    it('skips non-autocalculate non-ref fields', () => {
        const doc = { a: 1 };
        PolicyUtils.autoCalculateFields([{ name: 'a', autocalculate: false }], doc);
        assert.deepEqual(doc, { a: 1 });
    });
    it('recurses into nested ref object field', () => {
        const doc = { nested: { a: 2, b: 5 } };
        PolicyUtils.autoCalculateFields([
            { name: 'nested', isRef: true, fields: [{ name: 'sum', autocalculate: true, expression: 'a + b' }] },
        ], doc);
        assert.equal(doc.nested.sum, 7);
    });
    it('recurses into array ref field elements', () => {
        const doc = { items: [{ a: 1, b: 1 }, { a: 2, b: 3 }] };
        PolicyUtils.autoCalculateFields([
            { name: 'items', isRef: true, fields: [{ name: 'sum', autocalculate: true, expression: 'a + b' }] },
        ], doc);
        assert.equal(doc.items[0].sum, 2);
        assert.equal(doc.items[1].sum, 5);
    });
});

describe('@unit PolicyUtils.getQueryFilter', () => {
    it('builds $eq filter for a simple string value', () => {
        const f = PolicyUtils.getQueryFilter('field', 'abc');
        assert.deepEqual(f, { $eq: ['$field', 'abc'] });
    });
    it('rewrites credentialSubject path prefix', () => {
        const f = PolicyUtils.getQueryFilter('document.credentialSubject.0.x', 'v');
        assert.deepEqual(f, { $eq: ['$firstCredentialSubject.x', 'v'] });
    });
    it('rewrites verifiableCredential path prefix', () => {
        const f = PolicyUtils.getQueryFilter('document.verifiableCredential.0.y', 'v');
        assert.deepEqual(f, { $eq: ['$firstVerifiableCredential.y', 'v'] });
    });
    it('object value carries the operation', () => {
        const f = PolicyUtils.getQueryFilter('field', { $gt: 'zzz' });
        assert.deepEqual(f, { $gt: ['$field', 'zzz'] });
    });
    it('$nin string builds $not $in', () => {
        const f = PolicyUtils.getQueryFilter('field', { $nin: 'abc' });
        assert.deepEqual(f, { $not: { $in: ['$field', 'abc'] } });
    });
    it('numeric value produces $or of string and number forms', () => {
        const f = PolicyUtils.getQueryFilter('field', { $eq: 5 });
        assert.property(f, '$or');
        assert.deepEqual(f.$or[0], { $eq: ['$field', '5'] });
        assert.deepEqual(f.$or[1], { $eq: ['$field', 5] });
    });
    it('numeric $ne produces $and form', () => {
        const f = PolicyUtils.getQueryFilter('field', { $ne: 5 });
        assert.property(f, '$and');
    });
    it('numeric $nin produces $and of two $not $in', () => {
        const f = PolicyUtils.getQueryFilter('field', { $nin: 7 });
        assert.property(f, '$and');
        assert.equal(f.$and.length, 2);
    });
});

describe('@unit PolicyUtils.parseQueryNumberValue', () => {
    it('returns string/number tuple for numeric scalar', () => {
        assert.deepEqual(PolicyUtils.parseQueryNumberValue(5), ['5', 5]);
    });
    it('returns null for non-numeric scalar', () => {
        assert.isNull(PolicyUtils.parseQueryNumberValue('abc'));
    });
    it('handles numeric array', () => {
        assert.deepEqual(PolicyUtils.parseQueryNumberValue([1, 2]), [['1', '2'], [1, 2]]);
    });
    it('returns null when array has a non-numeric element', () => {
        assert.isNull(PolicyUtils.parseQueryNumberValue([1, 'x']));
    });
    it('returns null for empty array', () => {
        assert.isNull(PolicyUtils.parseQueryNumberValue([]));
    });
});
