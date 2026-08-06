import { assert } from 'chai';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

// ---------------------------------------------------------------------------
// resolveFieldPath
// ---------------------------------------------------------------------------
describe('PolicyUtils.resolveFieldPath', () => {
    it('resolves a simple key', () => {
        assert.equal(PolicyUtils.resolveFieldPath({ a: 1 }, 'a'), 1);
    });

    it('resolves a nested path', () => {
        assert.equal(PolicyUtils.resolveFieldPath({ a: { b: 2 } }, 'a.b'), 2);
    });

    it('broadcasts over an intermediate array', () => {
        const doc = { items: [{ qty: 10 }, { qty: 20 }] };
        assert.deepEqual(PolicyUtils.resolveFieldPath(doc, 'items.qty'), [10, 20]);
    });

    it('resolves numeric index segment', () => {
        const doc = { items: [10, 20, 30] };
        assert.equal(PolicyUtils.resolveFieldPath(doc, 'items.1'), 20);
    });

    it('resolves L segment to last element', () => {
        const doc = { items: [10, 20, 30] };
        assert.equal(PolicyUtils.resolveFieldPath(doc, 'items.L'), 30);
    });

    it('returns null for a missing field', () => {
        assert.isNull(PolicyUtils.resolveFieldPath({ a: 1 }, 'b'));
    });

    it('returns null for null data', () => {
        assert.isNull(PolicyUtils.resolveFieldPath(null, 'a'));
    });

    it('returns null for an empty field string', () => {
        assert.isNull(PolicyUtils.resolveFieldPath({ a: 1 }, ''));
    });
});

// ---------------------------------------------------------------------------
// evaluateFieldCondition
// ---------------------------------------------------------------------------
describe('PolicyUtils.evaluateFieldCondition', () => {
    // scalar comparisons
    it('equal — matching scalars', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition('hello', 'equal', 'hello'));
    });

    it('equal — mismatching scalars', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition('hello', 'equal', 'world'));
    });

    it('equal — coerces string to number', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition(10, 'equal', '10'));
    });

    it('not_equal — coerces correctly', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition(10, 'not_equal', '10'));
    });

    // array broadcast
    it('gt — all elements satisfy', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition([5, 10, 15], 'gt', 3));
    });

    it('gt — one element fails', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition([5, 2, 15], 'gt', 3));
    });

    // pairwise
    it('pairwise equal — both arrays match', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition([1, 2, 3], 'equal', [1, 2, 3]));
    });

    it('pairwise equal — one pair mismatches', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition([1, 3, 3], 'equal', [1, 2, 3]));
    });

    // length mismatch
    it('pairwise — length mismatch returns false', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition([1, 2, 3], 'equal', [1, 2]));
    });

    // empty array
    it('empty left vs scalar — fail-closed', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition([], 'gt', 5));
    });

    it('empty right vs scalar — fail-closed', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition(5, 'gt', []));
    });

    it('empty left vs empty right — passes', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition([], 'equal', []));
    });

    // in / not_in with CSV scalar right
    it('in — scalar in CSV list', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition('b', 'in', 'a,b,c'));
    });

    it('in — scalar missing from CSV list', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition('d', 'in', 'a,b,c'));
    });

    // in / not_in with resolved array right (valueSource: 'document' path)
    it('in — scalar left in resolved array right', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition(10, 'in', [10, 20, 30]));
    });

    it('in — scalar left absent from resolved array right', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition(99, 'in', [10, 20, 30]));
    });

    it('in — coerces types in resolved array membership', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition(10, 'in', ['10', '20']));
    });

    it('not_in — scalar not in resolved array right', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition(99, 'not_in', [10, 20, 30]));
    });

    // in with array left — all elements must be members (not positional)
    it('in — all left elements in resolved array right', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition([10, 20], 'in', [10, 20, 30]));
    });

    it('in — equal-length arrays use membership not position', () => {
        // [1, 2] in [2, 1]: positional would give 1===2 → false; membership gives true
        assert.isTrue(PolicyUtils.evaluateFieldCondition([1, 2], 'in', [2, 1]));
    });

    it('in — one left element missing from right array', () => {
        assert.isFalse(PolicyUtils.evaluateFieldCondition([10, 99], 'in', [10, 20, 30]));
    });

    it('not_in — all left elements absent from right', () => {
        assert.isTrue(PolicyUtils.evaluateFieldCondition([40, 50], 'not_in', [10, 20, 30]));
    });
});

// ---------------------------------------------------------------------------
// checkDocumentField
// ---------------------------------------------------------------------------
describe('PolicyUtils.checkDocumentField', () => {
    // new-style: valueSource: 'value'
    it('valueSource value — scalar equal passes', () => {
        const doc = { document: { credentialSubject: { qty: 10 } } };
        const filter = { field: 'document.credentialSubject.qty', type: 'equal', valueSource: 'value', value: '10' };
        assert.isTrue(PolicyUtils.checkDocumentField(doc, filter));
    });

    it('valueSource value — array broadcast gt passes', () => {
        const doc = { document: { credentialSubject: { items: [{ qty: 5 }, { qty: 8 }] } } };
        const filter = { field: 'document.credentialSubject.items.qty', type: 'gt', valueSource: 'value', value: '3' };
        assert.isTrue(PolicyUtils.checkDocumentField(doc, filter));
    });

    it('valueSource value — empty array fails (fail-closed)', () => {
        const doc = { document: { credentialSubject: { items: [] } } };
        const filter = { field: 'document.credentialSubject.items.qty', type: 'gt', valueSource: 'value', value: '0' };
        assert.isFalse(PolicyUtils.checkDocumentField(doc, filter));
    });

    // new-style: valueSource: 'document' (field-to-field)
    it('valueSource document — fields equal passes', () => {
        const doc = { document: { credentialSubject: { a: 10, b: 10 } } };
        const filter = { field: 'document.credentialSubject.a', type: 'equal', valueSource: 'document', value: 'document.credentialSubject.b' };
        assert.isTrue(PolicyUtils.checkDocumentField(doc, filter));
    });

    it('valueSource document — fields not equal fails', () => {
        const doc = { document: { credentialSubject: { a: 10, b: 20 } } };
        const filter = { field: 'document.credentialSubject.a', type: 'equal', valueSource: 'document', value: 'document.credentialSubject.b' };
        assert.isFalse(PolicyUtils.checkDocumentField(doc, filter));
    });

    it('valueSource document — in against resolved array', () => {
        const doc = { document: { credentialSubject: { tag: 'red', allowed: ['red', 'blue'] } } };
        const filter = { field: 'document.credentialSubject.tag', type: 'in', valueSource: 'document', value: 'document.credentialSubject.allowed' };
        assert.isTrue(PolicyUtils.checkDocumentField(doc, filter));
    });

    // legacy path (no valueSource) — regression cases
    it('legacy — equal with matching value passes', () => {
        const doc = { document: { credentialSubject: { status: 'active' } } };
        const filter = { field: 'document.credentialSubject.status', type: 'equal', value: 'active' };
        assert.isTrue(PolicyUtils.checkDocumentField(doc, filter));
    });

    it('legacy — equal pins strict type comparison (no coercion)', () => {
        // string '10' must not equal number 10 on the legacy path
        const doc = { document: { credentialSubject: { qty: 10 } } };
        const filter = { field: 'document.credentialSubject.qty', type: 'equal', value: '10' };
        assert.isFalse(PolicyUtils.checkDocumentField(doc, filter));
    });

    it('legacy — in with array value uses indexOf', () => {
        const doc = { document: { credentialSubject: { tags: ['a', 'b'] } } };
        const filter = { field: 'document.credentialSubject.tags', type: 'in', value: 'a' };
        assert.isTrue(PolicyUtils.checkDocumentField(doc, filter));
    });

    it('returns false for a null document', () => {
        assert.isFalse(PolicyUtils.checkDocumentField(null, { field: 'x', type: 'equal', value: '1' }));
    });
});

// ---------------------------------------------------------------------------
// firstFailingPair
// ---------------------------------------------------------------------------
describe('PolicyUtils.firstFailingPair', () => {
    it('returns scalar pair for plain comparison failure', () => {
        const [l, r] = PolicyUtils.firstFailingPair(5, 'equal', 10);
        assert.equal(l, 5);
        assert.equal(r, 10);
    });

    it('drills into pairwise array to return first failing scalars', () => {
        const [l, r] = PolicyUtils.firstFailingPair([1, 3, 5], 'equal', [1, 2, 5]);
        assert.equal(l, 3);
        assert.equal(r, 2);
    });

    it('returns length-mismatch sentinel', () => {
        const [l, r] = PolicyUtils.firstFailingPair([1, 2, 3], 'equal', [1, 2]);
        assert.include(l, '3');
        assert.include(r, 'mismatch');
    });

    it('returns empty-array sentinel for empty left vs scalar', () => {
        const [l] = PolicyUtils.firstFailingPair([], 'gt', 5);
        assert.equal(l, '(empty array)');
    });

    it('returns empty-array sentinel for both empty arrays', () => {
        const [l, r] = PolicyUtils.firstFailingPair([], 'equal', []);
        assert.equal(l, '(empty array)');
        assert.equal(r, '(empty array)');
    });

    it('returns failing element for in/not_in with array left', () => {
        const [l, r] = PolicyUtils.firstFailingPair([10, 99], 'in', [10, 20]);
        assert.equal(l, 99);
    });

    it('returns empty-array sentinel for in with empty left', () => {
        const [l] = PolicyUtils.firstFailingPair([], 'in', 'a,b');
        assert.equal(l, '(empty array)');
    });
});
