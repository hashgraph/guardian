import assert from 'node:assert/strict';
import { AnalyticsUtils } from '../dist/helpers/utils.js';

describe('AnalyticsUtils.topRateByCount', () => {
    it('counts occurrences of array[*][field] and returns sorted top-N', () => {
        const items = [
            { tag: 'a' }, { tag: 'a' }, { tag: 'b' },
            { tag: 'c' }, { tag: 'a' }, { tag: 'b' },
        ];
        const result = AnalyticsUtils.topRateByCount(items, 'tag', 2);
        assert.equal(result.length, 2);
        assert.equal(result[0].name, 'a');
        assert.equal(result[0].value, 3);
        assert.equal(result[1].name, 'b');
        assert.equal(result[1].value, 2);
    });

    it("buckets missing/falsy field values under ''", () => {
        const items = [{ tag: undefined }, { tag: null }, { tag: '' }, { tag: 'x' }];
        const result = AnalyticsUtils.topRateByCount(items, 'tag', 5);
        const empty = result.find((r) => r.name === '');
        assert.ok(empty);
        assert.equal(empty.value, 3);
    });

    it('returns at most `size` entries', () => {
        const items = [{ k: 'a' }, { k: 'b' }, { k: 'c' }];
        assert.equal(AnalyticsUtils.topRateByCount(items, 'k', 1).length, 1);
    });

    it('returns [] for an empty input array', () => {
        assert.deepEqual(AnalyticsUtils.topRateByCount([], 'k', 5), []);
    });
});

describe('AnalyticsUtils.topRateByValue', () => {
    it('returns the array sorted descending and truncated to size', () => {
        const items = [{ value: 1 }, { value: 5 }, { value: 3 }, { value: 9 }];
        const result = AnalyticsUtils.topRateByValue(items, 2);
        assert.deepEqual(result.map((r) => r.value), [9, 5]);
    });

    it('returns [] when input is empty', () => {
        assert.deepEqual(AnalyticsUtils.topRateByValue([], 5), []);
    });
});

describe('AnalyticsUtils.splitChunk', () => {
    it('splits an array into chunk-sized blocks', () => {
        const result = AnalyticsUtils.splitChunk([1, 2, 3, 4, 5], 2);
        assert.deepEqual(result, [[1, 2], [3, 4], [5]]);
    });

    it('returns a single chunk when chunk >= array length', () => {
        assert.deepEqual(AnalyticsUtils.splitChunk([1, 2], 5), [[1, 2]]);
    });

    it('returns [] for empty input', () => {
        assert.deepEqual(AnalyticsUtils.splitChunk([], 3), []);
    });
});

describe('AnalyticsUtils.unique', () => {
    it('keeps the first occurrence of each key value', () => {
        const items = [
            { id: 'a', n: 1 },
            { id: 'b', n: 2 },
            { id: 'a', n: 99 },
            { id: 'c', n: 3 },
        ];
        const result = AnalyticsUtils.unique(items, 'id');
        assert.deepEqual(result.map((r) => r.id), ['a', 'b', 'c']);
        assert.equal(result[0].n, 1);
    });

    it('returns the same array for already-unique input', () => {
        const items = [{ id: 'a' }, { id: 'b' }];
        assert.deepEqual(AnalyticsUtils.unique(items, 'id'), items);
    });
});

describe('AnalyticsUtils.compressMessages', () => {
    it('passes through non-chunked messages unchanged', async () => {
        const messages = [{ id: 'a' }, { id: 'b' }];
        const result = await AnalyticsUtils.compressMessages(messages);
        assert.deepEqual(result, messages);
    });

    it('joins chunk parts on the root (chunk_number=1) message', async () => {
        const messages = [
            { id: 'r', chunk_total: 3, chunk_id: 'g1', chunk_number: 1, message: 'foo' },
            { id: '2', chunk_total: 3, chunk_id: 'g1', chunk_number: 2, message: 'bar' },
            { id: '3', chunk_total: 3, chunk_id: 'g1', chunk_number: 3, message: 'baz' },
        ];
        const result = await AnalyticsUtils.compressMessages(messages);
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 'r');
        assert.equal(result[0].message, 'foobarbaz');
    });

    it('marks message=null when any chunk is non-string', async () => {
        const messages = [
            { id: 'r', chunk_total: 2, chunk_id: 'g2', chunk_number: 1, message: 'foo' },
            { id: '2', chunk_total: 2, chunk_id: 'g2', chunk_number: 2, message: { not: 'string' } },
        ];
        const result = await AnalyticsUtils.compressMessages(messages);
        assert.equal(result[0].message, null);
    });
});
