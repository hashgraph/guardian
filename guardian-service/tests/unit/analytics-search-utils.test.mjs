import assert from 'node:assert/strict';
import { SearchUtils } from '../../dist/analytics/search/utils/utils.js';

describe('SearchUtils.comparePath', () => {
    it('returns 1 when a is greater at the first differing index', () => {
        assert.equal(SearchUtils.comparePath([1, 2, 5], [1, 2, 3]), 1);
    });

    it('returns -1 when a is smaller at the first differing index', () => {
        assert.equal(SearchUtils.comparePath([1, 1], [1, 2]), -1);
    });

    it('returns 1 when a is a longer extension of b', () => {
        assert.equal(SearchUtils.comparePath([1, 2, 3], [1, 2]), 1);
    });

    it('returns -1 when a is a shorter prefix of b', () => {
        assert.equal(SearchUtils.comparePath([1, 2], [1, 2, 3]), -1);
    });

    it('returns -1 for two equal paths (no positive equality branch)', () => {
        assert.equal(SearchUtils.comparePath([1, 2, 3], [1, 2, 3]), -1);
    });

    it('compares from the first element', () => {
        assert.equal(SearchUtils.comparePath([2], [1, 9, 9]), 1);
        assert.equal(SearchUtils.comparePath([0], [1]), -1);
    });
});

describe('SearchUtils.calcTotalRates', () => {
    it('returns 0 for empty rates', () => {
        assert.equal(SearchUtils.calcTotalRates([], []), 0);
    });

    it('returns 0 when the lengths differ', () => {
        assert.equal(SearchUtils.calcTotalRates([1, 2], [1]), 0);
    });

    it('returns the floored weighted average', () => {
        assert.equal(SearchUtils.calcTotalRates([10, 20], [1, 3]), 17);
    });

    it('handles single-element arrays', () => {
        assert.equal(SearchUtils.calcTotalRates([42], [2]), 42);
    });

    it('returns 0 when all rates are 0', () => {
        assert.equal(SearchUtils.calcTotalRates([0, 0], [1, 2]), 0);
    });

    it('floors a non-integer average down', () => {
        assert.equal(SearchUtils.calcTotalRates([1, 2], [1, 1]), 1);
    });
});
