import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const pred = (name, value, extra = {}) => ({
    field: { name, type: 'string', isArray: false, isRef: false },
    fieldValue: value,
    ...extra,
});

describe('SchemaHelper.evaluateIfCondition', () => {
    it('single equals compares numeric string with number', () => {
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', '5'), { a: 5 }), true);
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', '6'), { a: 5 }), false);
    });

    it('AND requires all and is false when empty', () => {
        const data = { a: 1, b: 2 };
        assert.equal(SchemaHelper.evaluateIfCondition({ AND: [pred('a', 1), pred('b', 2)] }, data), true);
        assert.equal(SchemaHelper.evaluateIfCondition({ AND: [pred('a', 1), pred('b', 3)] }, data), false);
        assert.equal(SchemaHelper.evaluateIfCondition({ AND: [] }, data), false);
    });

    it('OR requires any and is false when empty', () => {
        const data = { a: 1, b: 2 };
        assert.equal(SchemaHelper.evaluateIfCondition({ OR: [pred('a', 9), pred('b', 2)] }, data), true);
        assert.equal(SchemaHelper.evaluateIfCondition({ OR: [pred('a', 9), pred('b', 9)] }, data), false);
        assert.equal(SchemaHelper.evaluateIfCondition({ OR: [] }, data), false);
    });

    it('uses nested fieldPath when longer than one segment', () => {
        const p = pred('c', 'x', { fieldPath: ['a', 'b', 'c'] });
        assert.equal(SchemaHelper.evaluateIfCondition(p, { a: { b: { c: 'x' } } }), true);
        assert.equal(SchemaHelper.evaluateIfCondition(p, { a: { b: { c: 'y' } } }), false);
    });

    it('ignores fieldPath of length one in favour of field.name', () => {
        const p = pred('a', 1, { fieldPath: ['zzz'] });
        assert.equal(SchemaHelper.evaluateIfCondition(p, { a: 1, zzz: 2 }), true);
    });

    it('missing value, null data and null condition are false', () => {
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 1), {}), false);
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 1), null), false);
        assert.equal(SchemaHelper.evaluateIfCondition(null, { a: 1 }), false);
        assert.equal(SchemaHelper.evaluateIfCondition(undefined, { a: 1 }), false);
    });

    it('array leaf: equals means each element, contains means any', () => {
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 1), { a: [1, 1] }), true);
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 1), { a: [1, 2] }), false);
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 1, { comparator: 'contains' }), { a: [1, 2] }), true);
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 3, { comparator: 'contains' }), { a: [1, 2] }), false);
    });

    it('array mid-path without entries does not match', () => {
        const p = pred('x', 1, { fieldPath: ['arr', 'x'] });
        assert.equal(SchemaHelper.evaluateIfCondition(p, { arr: [{ x: 1 }] }), false);
    });

    it('entries select the array element', () => {
        const p = pred('x', 1, { fieldPath: ['arr', 'x'] });
        const data = { arr: [{ x: 0 }, { x: 1 }] };
        assert.equal(SchemaHelper.evaluateIfCondition(p, data, undefined, { entries: { arr: 1 } }), true);
        assert.equal(SchemaHelper.evaluateIfCondition(p, data, undefined, { entries: { arr: 0 } }), false);
    });

    it('nested arrays use one entries key per level', () => {
        const p = pred('v', 'ok', { fieldPath: ['projects', 'sites', 'v'] });
        const data = { projects: [{ sites: [{ v: 'no' }] }, { sites: [{ v: 'no' }, { v: 'ok' }] }] };
        assert.equal(SchemaHelper.evaluateIfCondition(p, data, undefined,
            { entries: { projects: 1, 'projects.sites': 1 } }), true);
        assert.equal(SchemaHelper.evaluateIfCondition(p, data, undefined,
            { entries: { projects: 0, 'projects.sites': 0 } }), false);
    });

    it('anyEntry matches when any element matches', () => {
        const p = pred('x', 2, { fieldPath: ['arr', 'x'] });
        const data = { arr: [{ x: 1 }, { x: 2 }] };
        assert.equal(SchemaHelper.evaluateIfCondition(p, data, undefined, { anyEntry: true }), true);
        assert.equal(SchemaHelper.evaluateIfCondition(pred('x', 3, { fieldPath: ['arr', 'x'] }), data,
            undefined, { anyEntry: true }), false);
    });

    it('custom equalsFn is used', () => {
        const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 'ABC'), { a: 'abc' }, eq), true);
        assert.equal(SchemaHelper.evaluateIfCondition(pred('a', 'ABC'), { a: 'abc' }), false);
    });
});
