import assert from 'node:assert/strict';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

const doc = (fields) => ({ document: { credentialSubject: [fields] } });
const filter = (field, type, value) => ({ field, type, value });

describe('PolicyUtils.checkDocumentField', () => {
    describe('equal / not_equal', () => {
        it('equal: exact match', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Approved' }), filter('document.credentialSubject.0.status', 'equal', 'Approved')), true);
        });

        it('equal: mismatch', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Pending' }), filter('document.credentialSubject.0.status', 'equal', 'Approved')), false);
        });

        it('not_equal: different values', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Pending' }), filter('document.credentialSubject.0.status', 'not_equal', 'Approved')), true);
        });

        it('not_equal: same value', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Approved' }), filter('document.credentialSubject.0.status', 'not_equal', 'Approved')), false);
        });

        it('returns false for null document', () => {
            assert.equal(PolicyUtils.checkDocumentField(null, filter('field', 'equal', 'x')), false);
        });

        it('legacy equal: number field vs string value uses strict comparison (no coercion)', () => {
            // legacy path (no valueSource) must NOT coerce; amount=10 (number) !== '10' (string)
            const d = { document: { credentialSubject: [{ amount: 10 }] } };
            assert.equal(PolicyUtils.checkDocumentField(d, { field: 'document.credentialSubject.0.amount', type: 'equal', value: '10' }), false);
        });
    });

    describe('in / not_in (comma-separated list)', () => {
        it('in: field value is in the list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'B' }), filter('document.credentialSubject.0.type', 'in', 'A,B,C')), true);
        });

        it('in: field value is not in the list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'D' }), filter('document.credentialSubject.0.type', 'in', 'A,B,C')), false);
        });

        it('in: trims whitespace from list entries', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'B' }), filter('document.credentialSubject.0.type', 'in', 'A, B, C')), true);
        });

        it('in: single-entry list works', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'A' }), filter('document.credentialSubject.0.type', 'in', 'A')), true);
        });

        it('not_in: field value absent from list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'D' }), filter('document.credentialSubject.0.type', 'not_in', 'A,B,C')), true);
        });

        it('not_in: field value present in list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'A' }), filter('document.credentialSubject.0.type', 'not_in', 'A,B,C')), false);
        });
    });

    describe('gt / gte / lt / lte — numeric coercion', () => {
        it('gt: numeric string field > numeric string config', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: '10' }), filter('document.credentialSubject.0.amount', 'gt', '5')), true);
        });

        it('gt: numeric field (number type) vs numeric string config', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: 10 }), filter('document.credentialSubject.0.amount', 'gt', '5')), true);
        });

        it('gt: equal values is false', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: 5 }), filter('document.credentialSubject.0.amount', 'gt', '5')), false);
        });

        it('gt: less-than is false', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: 3 }), filter('document.credentialSubject.0.amount', 'gt', '5')), false);
        });

        it('gt: avoids lexicographic trap — 9 > 10 is false numerically', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: '9' }), filter('document.credentialSubject.0.amount', 'gt', '10')), false);
        });

        it('gte: equal values is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: 5 }), filter('document.credentialSubject.0.amount', 'gte', '5')), true);
        });

        it('lt: field less than config', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: 3 }), filter('document.credentialSubject.0.amount', 'lt', '5')), true);
        });

        it('lte: equal values is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ amount: 5 }), filter('document.credentialSubject.0.amount', 'lte', '5')), true);
        });
    });

    describe('gt / gte / lt / lte — Date coercion', () => {
        it('gt: later ISO date is greater', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-06-01' }), filter('document.credentialSubject.0.date', 'gt', '2024-01-01')), true);
        });

        it('gt: earlier ISO date is not greater', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-01-01' }), filter('document.credentialSubject.0.date', 'gt', '2024-06-01')), false);
        });

        it('gte: same ISO date is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-06-01' }), filter('document.credentialSubject.0.date', 'gte', '2024-06-01')), true);
        });

        it('lt: earlier ISO date is less', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2023-12-31' }), filter('document.credentialSubject.0.date', 'lt', '2024-01-01')), true);
        });

        it('lte: same date is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-01-01' }), filter('document.credentialSubject.0.date', 'lte', '2024-01-01')), true);
        });

        it('full ISO timestamp comparison', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ ts: '2024-06-01T12:00:00.000Z' }), filter('document.credentialSubject.0.ts', 'gt', '2024-06-01T10:00:00.000Z')), true);
        });
    });

    describe('gt / gte / lt / lte — non-date strings', () => {
        it('status string "Approved" compared to another string returns a boolean', () => {
            const result = PolicyUtils.checkDocumentField(
                doc({ status: 'Approved' }),
                filter('document.credentialSubject.0.status', 'gt', 'Active')
            );
            assert.equal(typeof result, 'boolean');
        });
    });

    describe('unknown operator', () => {
        it('returns false for unrecognised operator', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ x: 1 }), filter('document.credentialSubject.0.x', 'regex', '.*')), false);
        });
    });
});

describe('PolicyUtils.resolveFieldPath', () => {
    it('resolves a simple flat path', () => {
        assert.equal(PolicyUtils.resolveFieldPath({ a: { b: 1 } }, 'a.b'), 1);
    });

    it('returns null for missing key', () => {
        assert.equal(PolicyUtils.resolveFieldPath({ a: 1 }, 'b'), null);
    });

    it('returns null for null data', () => {
        assert.equal(PolicyUtils.resolveFieldPath(null, 'a'), null);
    });

    it('maps over intermediate array (broadcast semantics)', () => {
        const data = { items: [{ amount: 10 }, { amount: 20 }] };
        assert.deepEqual(PolicyUtils.resolveFieldPath(data, 'items.amount'), [10, 20]);
    });

    it('resolves numeric index into array', () => {
        const data = { credentialSubject: [{ status: 'Approved' }] };
        assert.equal(PolicyUtils.resolveFieldPath(data, 'credentialSubject.0.status'), 'Approved');
    });

    it('L segment resolves to last element', () => {
        const data = [1, 2, 3];
        assert.equal(PolicyUtils.resolveFieldPath(data, 'L'), 3);
    });
});

describe('PolicyUtils.evaluateFieldCondition', () => {
    it('scalar equal: matching values', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('A', 'equal', 'A'), true);
    });

    it('scalar equal: mismatched values', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('A', 'equal', 'B'), false);
    });

    it('equal: coerces number and string (10 equal "10")', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition(10, 'equal', '10'), true);
    });

    it('not_equal: coerces number and string (10 not_equal "10" → false)', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition(10, 'not_equal', '10'), false);
    });

    it('empty array vs scalar fails (fail-closed)', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([], 'equal', 'A'), false);
    });

    it('scalar vs empty array fails (fail-closed)', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('A', 'equal', []), false);
    });

    it('empty array vs empty array passes', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([], 'equal', []), true);
    });

    it('array vs scalar: for-all semantics pass when all match', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([5, 10], 'gt', 3), true);
    });

    it('array vs scalar: for-all semantics fail when any element fails', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([5, 2], 'gt', 3), false);
    });

    it('pairwise equal: same length arrays matching positionally', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([1, 2], 'equal', [1, 2]), true);
    });

    it('pairwise equal: length mismatch fails', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([1, 2], 'equal', [1, 2, 3]), false);
    });

    it('in: scalar in CSV list', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('A', 'in', 'A,B,C'), true);
    });

    it('in: scalar not in CSV list', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('D', 'in', 'A,B,C'), false);
    });

    it('in: scalar is member of array right-side', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('B', 'in', ['A', 'B', 'C']), true);
    });

    it('in: scalar not in array right-side', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('D', 'in', ['A', 'B', 'C']), false);
    });

    it('not_in: scalar is not member of array right-side', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('D', 'not_in', ['A', 'B', 'C']), true);
    });

    it('not_in: a scalar is not in the empty set', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('D', 'not_in', []), true);
    });

    it('in: a scalar is never in the empty set', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('D', 'in', []), false);
    });

    it('in/not_in: an empty left side still fails closed', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([], 'not_in', ['A']), false);
        assert.equal(PolicyUtils.evaluateFieldCondition([], 'in', ['A']), false);
    });

    it('the empty-array guard still applies to the comparison operators', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('A', 'equal', []), false);
        assert.equal(PolicyUtils.evaluateFieldCondition('5', 'gte', []), false);
    });

    it('in: array left — every element must be in right', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition(['A', 'B'], 'in', ['A', 'B', 'C']), true);
    });

    it('in: array left — fails if any element not in right', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition(['A', 'D'], 'in', ['A', 'B', 'C']), false);
    });

    it('in: array left all in CSV string right', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition(['A', 'B'], 'in', 'A,B,C'), true);
    });

    it('in: array left partial match in CSV string right fails', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition(['A', 'D'], 'in', 'A,B,C'), false);
    });

    it('in: array left vs single-value CSV - all must be in that set, not array-contains-scalar', () => {
        // old evaluateCrossCondition: ['A','B'].includes('A') -> true (array contains scalar)
        // new: every element of left must be in set {'A'} -> 'B' not in {'A'} -> false
        assert.equal(PolicyUtils.evaluateFieldCondition(['A', 'B'], 'in', 'A'), false);
    });

    it('in: equal-length arrays use membership, not position ([1,2] in [2,1])', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([1, 2], 'in', [2, 1]), true);
    });

    it('unknown operator returns false', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition('A', 'regex', 'A.*'), false);
    });

    it('scalar vs array (non-in/not_in): type mismatch fails', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition(1, 'equal', [1]), false);
    });

    // Asymmetry: array-left is valid for-all broadcast; scalar-left + array-right is a
    // misconfiguration (collection field must be on the left) and returns false explicitly.
    it('array-left vs scalar-right: for-all broadcast (items[].amount gt 5)', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([10, 20, 30], 'gt', 5), true);
        assert.equal(PolicyUtils.evaluateFieldCondition([10, 3, 30], 'gt', 5), false);
    });

    it('scalar-left vs array-right on relational op returns false (not JS coercion)', () => {
        // 5 gt [3] must be false — not accidentally true via String([3])→"3"
        assert.equal(PolicyUtils.evaluateFieldCondition(5, 'gt', [3]), false);
        assert.equal(PolicyUtils.evaluateFieldCondition(5, 'gt', [3, 4]), false);
        assert.equal(PolicyUtils.evaluateFieldCondition(5, 'lte', [9]), false);
    });

    it('in: empty left array vs non-empty right array fails', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([], 'in', [1, 2, 3]), false);
    });

    it('not_in: empty left array vs non-empty right array fails', () => {
        assert.equal(PolicyUtils.evaluateFieldCondition([], 'not_in', [1, 2, 3]), false);
    });
});

describe('PolicyUtils.firstFailingPair', () => {
    it('scalars: returns them directly', () => {
        assert.deepEqual(PolicyUtils.firstFailingPair(1, 'gt', 5), [1, 5]);
    });

    it('array vs scalar: returns first failing element', () => {
        assert.deepEqual(PolicyUtils.firstFailingPair([10, 2], 'gt', 5), [2, 5]);
    });

    it('equal-length arrays: drills to first failing positional pair', () => {
        assert.deepEqual(PolicyUtils.firstFailingPair([1, 3], 'equal', [1, 4]), [3, 4]);
    });

    it('length mismatch: returns descriptive sentinels', () => {
        const [l, r] = PolicyUtils.firstFailingPair([1, 2], 'equal', [1]);
        assert.match(r, /length mismatch/);
    });

    it('empty array vs scalar: returns empty-array sentinel', () => {
        const [l] = PolicyUtils.firstFailingPair([], 'equal', 'x');
        assert.equal(l, '(empty array)');
    });
});
