import assert from 'node:assert/strict';
import { SearchUtils } from '../../dist/analytics/search/utils/utils.js';

describe('SearchUtils.comparePath', () => {
    it('returns -1 when the first differing element of a is smaller', () => {
        assert.equal(SearchUtils.comparePath([1, 2, 3], [1, 5, 0]), -1);
    });

    it('returns 1 when the first differing element of a is larger', () => {
        assert.equal(SearchUtils.comparePath([1, 9], [1, 2, 3]), 1);
    });

    it('compares at the first index that differs (index 0)', () => {
        assert.equal(SearchUtils.comparePath([2], [1, 1, 1]), 1);
        assert.equal(SearchUtils.comparePath([0, 9, 9], [1]), -1);
    });

    it('returns 1 when a is a strict prefix-longer of b (equal prefix, a longer)', () => {
        assert.equal(SearchUtils.comparePath([1, 2, 3], [1, 2]), 1);
    });

    it('returns -1 when b is longer and shares the whole prefix', () => {
        assert.equal(SearchUtils.comparePath([1, 2], [1, 2, 3]), -1);
    });

    it('returns -1 for two identical paths (length tie falls through to length compare)', () => {
        assert.equal(SearchUtils.comparePath([4, 5, 6], [4, 5, 6]), -1);
    });

    it('returns -1 for two empty paths', () => {
        assert.equal(SearchUtils.comparePath([], []), -1);
    });

    it('returns 1 when a is non-empty and b is empty', () => {
        assert.equal(SearchUtils.comparePath([0], []), 1);
    });

    it('returns -1 when a is empty and b is non-empty', () => {
        assert.equal(SearchUtils.comparePath([], [0]), -1);
    });

    it('stops at the first mismatch even if later elements would flip the result', () => {
        assert.equal(SearchUtils.comparePath([1, 0, 100], [0, 100, 100]), 1);
    });
});

describe('SearchUtils.calcTotalRates', () => {
    it('returns 0 for empty rates', () => {
        assert.equal(SearchUtils.calcTotalRates([], []), 0);
    });

    it('returns 0 when rates and coefficients differ in length', () => {
        assert.equal(SearchUtils.calcTotalRates([10, 20], [1]), 0);
    });

    it('computes a simple unit-weighted average', () => {
        assert.equal(SearchUtils.calcTotalRates([10, 20, 30], [1, 1, 1]), 20);
    });

    it('weights rates by their coefficients', () => {
        assert.equal(SearchUtils.calcTotalRates([100, 0], [3, 1]), 75);
    });

    it('floors the weighted average', () => {
        assert.equal(SearchUtils.calcTotalRates([10, 11], [1, 1]), 10);
    });

    it('handles a single rate/coefficient pair', () => {
        assert.equal(SearchUtils.calcTotalRates([42], [5]), 42);
    });

    it('a zero coefficient excludes a rate from both numerator and denominator', () => {
        assert.equal(SearchUtils.calcTotalRates([100, 50], [0, 2]), 50);
    });

    it('yields NaN when all coefficients are zero (divide by zero length)', () => {
        const result = SearchUtils.calcTotalRates([10, 20], [0, 0]);
        assert.ok(Number.isNaN(result));
    });
});
