import assert from 'node:assert/strict';
import { MultiCompareUtils } from '../../dist/analytics/compare/utils/multi-compare-utils.js';

const reportRow = (left, right) => ({ left, right });

describe('MultiCompareUtils.mergeTables', () => {
    it('returns one entry per left-side row, with cols sized to inputs+1', () => {
        const t1 = { report: [reportRow('a', null), reportRow('b', null)] };
        const t2 = { report: [reportRow('a', null), reportRow('b', null)] };
        const out = MultiCompareUtils.mergeTables([t1, t2]);
        assert.equal(out.length, 2);
        assert.equal(out[0].cols.length, 3);
    });

    it('places left rows on column 0 (mirrored from leftmost left input)', () => {
        const t1 = { report: [reportRow('A', null)] };
        const t2 = { report: [reportRow('A', null)] };
        const out = MultiCompareUtils.mergeTables([t1, t2]);
        assert.equal(out[0].cols[0], out[0].cols[1]);
    });

    it('appends a right-only row as a sub-row of the last left row', () => {
        const t1 = { report: [reportRow('A', null)] };
        const t2 = { report: [reportRow(null, 'right-only')] };
        const out = MultiCompareUtils.mergeTables([t1, t2]);
        // mainIndex=1 (one left row added), subIndex=1 for the right-only entry.
        const sub = out.find((r) => r.subIndex === 1);
        assert.ok(sub, 'sub-row missing');
        assert.equal(sub.cols[2].right, 'right-only');
    });

    it('sorts rows by (mainIndex, subIndex)', () => {
        const t1 = {
            report: [
                reportRow('first', null),
                reportRow('second', null),
            ],
        };
        const t2 = {
            report: [
                reportRow('first', null),
                reportRow(null, 'right-after-first'),
                reportRow('second', null),
            ],
        };
        const out = MultiCompareUtils.mergeTables([t1, t2]);
        // Order: (1,0), (1,1), (2,0) — verifies stable sort.
        const labels = out.map((r) => `${r.mainIndex}.${r.subIndex}`);
        assert.deepEqual(labels, ['1.0', '1.1', '2.0']);
    });
});

describe('MultiCompareUtils.mergeRates', () => {
    const rateRow = (left, right, totalRate = 100, type = 'FULL') => ({
        type,
        totalRate,
        items: [left, right],
    });

    it('returns one entry per left rate', () => {
        const left = [rateRow({ k: 'a' }, null), rateRow({ k: 'b' }, null)];
        const right = [rateRow({ k: 'a' }, { k: 'a' }), rateRow({ k: 'b' }, { k: 'b' })];
        const out = MultiCompareUtils.mergeRates([left, right]);
        // Each merged result row has cols sized to the number of input rate-tables.
        assert.equal(out.length >= 2, true);
        assert.equal(out[0].cols.length, 2);
    });

    it('left rates produce items with item: items[0]', () => {
        const left = [rateRow({ k: 'a' }, null)];
        const right = [];
        const out = MultiCompareUtils.mergeRates([left, right]);
        assert.deepEqual(out[0].cols[0].item, { k: 'a' });
    });

    it('right rates produce items with item: items[1]', () => {
        const left = [rateRow({ k: 'a' }, null)];
        const right = [rateRow({ k: 'a' }, { k: 'a-from-right' })];
        const out = MultiCompareUtils.mergeRates([left, right]);
        const merged = out.find((r) => r.cols[1]);
        assert.deepEqual(merged.cols[1].item, { k: 'a-from-right' });
    });

    it('handles a missing left table by emitting only right entries', () => {
        const right = [rateRow({ k: 'a' }, { k: 'a' })];
        const out = MultiCompareUtils.mergeRates([null, right]);
        assert.equal(out.length, 1);
        assert.deepEqual(out[0].cols[1].item, { k: 'a' });
    });

    it('skips a left rate whose items[0] is missing', () => {
        const left = [rateRow(null, null)];
        const right = [];
        const out = MultiCompareUtils.mergeRates([left, right]);
        assert.equal(out.length, 0);
    });
});
