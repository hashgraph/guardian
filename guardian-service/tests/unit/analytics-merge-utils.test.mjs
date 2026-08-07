import assert from 'node:assert/strict';
import { MergeUtils } from '../../dist/analytics/compare/utils/merge-utils.js';

const wm = (key, weights = [], opts = {}) => ({
    key,
    getWeights: () => weights,
    maxWeight: opts.maxWeight ?? (() => weights.length || 1),
    checkWeight: opts.checkWeight ?? (() => true),
    equal: opts.equal ?? ((other) => other?.key === key),
});

describe('MergeUtils.fullMerge', () => {
    it('pairs items 1:1 by index', () => {
        const a = [wm('a1'), wm('a2')];
        const b = [wm('b1'), wm('b2')];
        const out = MergeUtils.fullMerge(a, b);
        assert.equal(out.length, 2);
        assert.equal(out[0].left, a[0]);
        assert.equal(out[0].right, b[0]);
        assert.equal(out[0].key, 'a1');
    });

    it('fills the shorter side with undefined and uses the right-side key when left is missing', () => {
        const a = [wm('a1')];
        const b = [wm('b1'), wm('b2')];
        const out = MergeUtils.fullMerge(a, b);
        assert.equal(out.length, 2);
        assert.equal(out[1].left, undefined);
        assert.equal(out[1].right, b[1]);
        assert.equal(out[1].key, 'b2');
    });

    it('returns [] when both inputs are empty', () => {
        assert.deepEqual(MergeUtils.fullMerge([], []), []);
    });
});

describe('MergeUtils.notMerge', () => {
    it('emits left-only and right-only entries (no pairing)', () => {
        const a = [wm('a1'), wm('a2')];
        const b = [wm('b1')];
        const out = MergeUtils.notMerge(a, b);
        assert.equal(out.length, 3);
        assert.equal(out[0].right, null);
        assert.equal(out[1].right, null);
        assert.equal(out[2].left, null);
    });

    it('handles a missing/undefined input safely', () => {
        const a = [wm('x')];
        const out = MergeUtils.notMerge(a, undefined);
        assert.equal(out.length, 1);
        assert.equal(out[0].right, null);
    });

    it('returns [] when both sides are empty', () => {
        assert.deepEqual(MergeUtils.notMerge([], []), []);
    });
});

describe('MergeUtils.fullMultiMerge', () => {
    it('aligns multiple lists column-by-column up to the longest', () => {
        const lists = [
            [wm('x1'), wm('x2'), wm('x3')],
            [wm('y1')],
            [wm('z1'), wm('z2')],
        ];
        const out = MergeUtils.fullMultiMerge(lists);
        assert.equal(out.length, 3);
        assert.equal(out[0].items.length, 3);
        assert.equal(out[1].items[1], undefined);
        assert.equal(out[2].items[1], undefined);
    });

    it('uses the first non-null key in the row as the row key', () => {
        const lists = [
            [],
            [wm('only-y')],
        ];
        const out = MergeUtils.fullMultiMerge(lists);
        assert.equal(out[0].key, 'only-y');
    });
});

describe('MergeUtils.notMultiMerge', () => {
    it('emits one row per item per array, with the rest of the slots null', () => {
        const lists = [
            [wm('a1')],
            [wm('b1'), wm('b2')],
        ];
        const out = MergeUtils.notMultiMerge(lists);
        assert.equal(out.length, 3);
        assert.equal(out[0].items[0].key, 'a1');
        assert.equal(out[0].items[1], null);
        assert.equal(out[1].items[0], null);
        assert.equal(out[1].items[1].key, 'b1');
    });
});

describe('MergeUtils.partlyMerge', () => {
    it('pairs equal items via .equal() under checkWeight()', () => {
        const left = [wm('match'), wm('only-left')];
        const right = [wm('match')];
        const out = MergeUtils.partlyMerge(left, right);
        const matched = out.find((r) => r.left?.key === 'match');
        assert.ok(matched.right);
        assert.equal(matched.right.key, 'match');
    });

    it('appends right-only entries for unmatched right items', () => {
        const left = [wm('a')];
        const right = [wm('b')];
        const out = MergeUtils.partlyMerge(left, right);
        const orphan = out.find((r) => r.left === null);
        assert.ok(orphan);
        assert.equal(orphan.right.key, 'b');
    });
});

describe('MergeUtils.mapping', () => {
    it('attaches a child to the first unpaired left whose .equal() succeeds', () => {
        const left = wm('match');
        const result = [{ key: 'match', left, right: null }];
        const child = wm('match');
        const ok = MergeUtils.mapping(result, child, 0);
        assert.equal(ok, true);
        assert.equal(result[0].right, child);
    });

    it('returns false when no row matches', () => {
        const left = wm('a');
        const result = [{ key: 'a', left, right: null }];
        const ok = MergeUtils.mapping(result, wm('b'), 0);
        assert.equal(ok, false);
        assert.equal(result[0].right, null);
    });

    it('falls back to a key-equality match when checkWeight is false', () => {
        const left = wm('k', [], { checkWeight: () => false, equal: () => false });
        const result = [{ key: 'k', left, right: null }];
        const ok = MergeUtils.mapping(result, wm('k'), 0);
        assert.equal(ok, true);
    });
});

describe('MergeUtils.getDiff', () => {
    it('returns 0 when either side is missing', () => {
        const item = wm('x', [1, 2, 3]);
        assert.equal(MergeUtils.getDiff(null, item), 0);
        assert.equal(MergeUtils.getDiff(item, null), 0);
    });

    it('returns 100 when all weights match exactly', () => {
        const a = wm('x', [1, 2, 3]);
        const b = wm('y', [1, 2, 3]);
        assert.equal(MergeUtils.getDiff(a, b), 100);
    });

    it('subtracts 1/(N+1) per differing weight, then floors *100', () => {
        const a = wm('x', [1, 2, 3, 4]); // N=4
        const b = wm('y', [1, 9, 9, 4]); // 2 differ
        // result = 1 - 2/(4+1) = 0.6 -> floor(60) = 60
        assert.equal(MergeUtils.getDiff(a, b), 60);
    });

    it('clamps to 0 when many weights differ', () => {
        const a = wm('x', [1, 1, 1]); // N=3
        const b = wm('y', [9, 9, 9, 9]); // all 3 differ; 4th compared but absent on a
        // 1 - 3/(3+1) = 0.25 -> 25
        assert.equal(MergeUtils.getDiff(a, b), 25);
    });
});
