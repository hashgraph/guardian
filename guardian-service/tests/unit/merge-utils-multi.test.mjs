import assert from 'node:assert/strict';
import { MergeUtils } from '../../dist/analytics/compare/utils/merge-utils.js';

const wm = (key, opts = {}) => ({
    key,
    getWeights: () => opts.weights || [],
    maxWeight: opts.maxWeight ?? (() => (opts.weights ? opts.weights.length : 1)),
    checkWeight: opts.checkWeight ?? (() => true),
    equal: opts.equal ?? ((other, _it) => other && other.key === key),
});

describe('MergeUtils.getMultiKey', () => {
    it('returns the first non-empty key', () => {
        assert.equal(MergeUtils.getMultiKey([null, { key: 'b' }, { key: 'c' }]), 'b');
    });
    it('returns null when no item has a key', () => {
        assert.equal(MergeUtils.getMultiKey([null, undefined, {}]), null);
    });
    it('returns null for an empty array', () => {
        assert.equal(MergeUtils.getMultiKey([]), null);
    });
    it('skips items with falsy key', () => {
        assert.equal(MergeUtils.getMultiKey([{ key: '' }, { key: 0 }, { key: 'x' }]), 'x');
    });
    it('returns the first key when several present', () => {
        assert.equal(MergeUtils.getMultiKey([{ key: 'first' }, { key: 'second' }]), 'first');
    });
});

describe('MergeUtils.getKey', () => {
    it('returns left key when left present', () => {
        assert.equal(MergeUtils.getKey({ key: 'L' }, { key: 'R' }), 'L');
    });
    it('returns right key when only right present', () => {
        assert.equal(MergeUtils.getKey(null, { key: 'R' }), 'R');
    });
    it('returns null when both missing', () => {
        assert.equal(MergeUtils.getKey(null, null), null);
    });
    it('returns left key when right omitted', () => {
        assert.equal(MergeUtils.getKey({ key: 'only' }), 'only');
    });
    it('returns null when left omitted and right omitted', () => {
        assert.equal(MergeUtils.getKey(undefined, undefined), null);
    });
});

describe('MergeUtils.notMultiMerge', () => {
    it('creates one row per item placed at its array index', () => {
        const a = [wm('a1')];
        const b = [wm('b1'), wm('b2')];
        const out = MergeUtils.notMultiMerge([a, b]);
        assert.equal(out.length, 3);
        assert.equal(out[0].items[0], a[0]);
        assert.equal(out[0].items[1], null);
        assert.equal(out[1].items[1], b[0]);
        assert.equal(out[1].items[0], null);
        assert.equal(out[2].items[1], b[1]);
    });
    it('uses item key as row key', () => {
        const out = MergeUtils.notMultiMerge([[wm('k1')]]);
        assert.equal(out[0].key, 'k1');
    });
    it('returns empty for all-empty arrays', () => {
        const out = MergeUtils.notMultiMerge([[], []]);
        assert.equal(out.length, 0);
    });
    it('produces rows whose items length matches the number of arrays', () => {
        const out = MergeUtils.notMultiMerge([[wm('x')], [], []]);
        assert.equal(out[0].items.length, 3);
    });
});

describe('MergeUtils.fullMultiMerge', () => {
    it('aligns arrays of different lengths by index with nulls', () => {
        const a = [wm('a0'), wm('a1')];
        const b = [wm('b0')];
        const out = MergeUtils.fullMultiMerge([a, b]);
        assert.equal(out.length, 2);
        assert.equal(out[0].items[0], a[0]);
        assert.equal(out[0].items[1], b[0]);
        assert.equal(out[1].items[1], undefined);
    });
    it('derives row key from first available item', () => {
        const out = MergeUtils.fullMultiMerge([[null], [wm('present')]]);
        assert.equal(out[0].key, 'present');
    });
    it('returns empty when all arrays empty', () => {
        assert.equal(MergeUtils.fullMultiMerge([[], []]).length, 0);
    });
});

describe('MergeUtils.multiMapping', () => {
    it('places child when left matches by weight+equal', () => {
        const left = wm('m', { checkWeight: () => true, equal: (o) => o.key === 'm' });
        const result = [{ key: 'm', items: [left, null] }];
        const ok = MergeUtils.multiMapping(result, 1, wm('m'), 0);
        assert.equal(ok, true);
        assert.equal(result[0].items[1].key, 'm');
    });
    it('falls back to key equality when checkWeight is false', () => {
        const left = wm('k', { checkWeight: () => false, equal: () => false });
        const result = [{ key: 'k', items: [left, null] }];
        const ok = MergeUtils.multiMapping(result, 1, { key: 'k' }, 3);
        assert.equal(ok, true);
        assert.equal(result[0].items[1].key, 'k');
    });
    it('returns false when nothing matches', () => {
        const left = wm('a', { checkWeight: () => true, equal: () => false });
        const result = [{ key: 'a', items: [left, null] }];
        assert.equal(MergeUtils.multiMapping(result, 1, { key: 'z' }, 0), false);
    });
    it('skips rows that already have the slot filled', () => {
        const left = wm('a', { checkWeight: () => true, equal: () => true });
        const result = [{ key: 'a', items: [left, wm('taken')] }];
        assert.equal(MergeUtils.multiMapping(result, 1, { key: 'a' }, 0), false);
        assert.equal(result[0].items[1].key, 'taken');
    });
    it('skips rows with no left item', () => {
        const result = [{ key: null, items: [null, null] }];
        assert.equal(MergeUtils.multiMapping(result, 1, { key: 'a' }, 0), false);
    });
});

describe('MergeUtils.partlyMultiMerge', () => {
    it('keeps left items and merges matching right items into the same row', () => {
        const left = wm('p', { maxWeight: () => 0, checkWeight: () => true, equal: (o) => o.key === 'p' });
        const right = wm('p');
        const out = MergeUtils.partlyMultiMerge([[left], [right]]);
        assert.equal(out.length, 1);
        assert.equal(out[0].items[0], left);
        assert.equal(out[0].items[1], right);
    });
    it('appends unmatched right items as new rows', () => {
        const left = wm('a', { maxWeight: () => 0, checkWeight: () => true, equal: () => false });
        const right = wm('b');
        const out = MergeUtils.partlyMultiMerge([[left], [right]]);
        assert.equal(out.length, 2);
        assert.equal(out[0].items[0], left);
        assert.equal(out[1].items[1], right);
    });
    it('handles a single array (no right side)', () => {
        const left = wm('solo', { maxWeight: () => 0 });
        const out = MergeUtils.partlyMultiMerge([[left]]);
        assert.equal(out.length, 1);
        assert.equal(out[0].items[0], left);
    });
    it('skips a null right array', () => {
        const left = wm('x', { maxWeight: () => 0 });
        const out = MergeUtils.partlyMultiMerge([[left], null]);
        assert.equal(out.length, 1);
    });
    it('row items length equals number of input arrays', () => {
        const left = wm('x', { maxWeight: () => 0 });
        const out = MergeUtils.partlyMultiMerge([[left], [], []]);
        assert.equal(out[0].items.length, 3);
    });
});
