import assert from 'node:assert/strict';
import {
    Expression, MAX_RANGE_CELLS, MAX_EXPRESSION_CELLS, RangeTooLargeError
} from '../../../dist/xlsx/models/expression.js';

/*
 * parseRange expands a range into one string per row, with the row
 * numbers taken from the formula text of an uploaded .xlsx and no bound of any
 * kind. `=SUM(A1:A99999999)` asks for 100 million strings; the process aborts on
 * OOM, which the try/catch around the parse cannot contain because a heap abort
 * is not an exception.
 *
 * These tests deliberately do NOT attempt the unbounded allocation - a test that
 * reproduced the crash would take the runner down with it. They assert the bound
 * instead: the refusal happens before anything is allocated.
 */
describe('@unit Expression range bounds', () => {
    it('expands an ordinary range unchanged', () => {
        const e = new Expression('eq', 'sum(A1:A3)');
        e.parse();
        assert.deepEqual(e.ranges.get('A1_A3'), ['A1', 'A2', 'A3']);
    });

    it('allows a range exactly at the cap', () => {
        const e = new Expression('eq', `sum(A1:A${MAX_RANGE_CELLS})`);
        e.parse();
        assert.equal(e.ranges.get(`A1_A${MAX_RANGE_CELLS}`).length, MAX_RANGE_CELLS);
    });

    it('refuses one cell beyond the cap', () => {
        const e = new Expression('eq', `sum(A1:A${MAX_RANGE_CELLS + 1})`);
        assert.throws(() => e.parse(), RangeTooLargeError);
    });

    it('refuses the crafted range from the report without allocating it', () => {
        const e = new Expression('eq', 'sum(A1:A99999999)');
        const started = Date.now();
        assert.throws(() => e.parse(), RangeTooLargeError);
        // the point of the fix: it fails fast rather than filling the heap
        assert.ok(Date.now() - started < 1000, 'must refuse before expanding');
        assert.equal(e.ranges.size, 0);
    });

    it('says why, rather than reporting a syntax error', () => {
        const e = new Expression('eq', 'sum(A1:A99999999)');
        assert.throws(() => e.parse(), /spans 99999999 cells/);
    });

    it('still reports a genuinely malformed range as invalid', () => {
        const e = new Expression('eq', 'sum(A1:B9)');   // differing columns
        assert.throws(() => e.parse(), /Invalid range/);
    });

    it('caps the total across several ranges in one formula', () => {
        // each range is under the per-range cap; together they exceed the total
        const per = MAX_RANGE_CELLS;
        const needed = Math.floor(MAX_EXPRESSION_CELLS / per) + 1;
        const terms = Array.from({ length: needed }, (_, i) => {
            const col = String.fromCharCode(65 + i);
            return `sum(${col}1:${col}${per})`;
        }).join('+');
        const e = new Expression('eq', terms);
        assert.throws(() => e.parse(), RangeTooLargeError);
    });

    it('leaves a formula whose ranges total under the cap alone', () => {
        const e = new Expression('eq', 'sum(A1:A10)+sum(B1:B10)');
        e.parse();
        assert.equal(e.ranges.size, 2);
        assert.equal(e.ranges.get('A1_A10').length, 10);
    });
});
