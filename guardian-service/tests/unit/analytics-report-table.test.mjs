import assert from 'node:assert/strict';
import { ReportTable } from '../../dist/analytics/compare/table/report-table.js';
import { ReportRow } from '../../dist/analytics/compare/table/report-row.js';

describe('ReportTable construction', () => {
    it('accepts a string[] of column names', () => {
        const t = new ReportTable(['a', 'b', 'c']);
        assert.deepEqual(t.columns, ['a', 'b', 'c']);
        assert.deepEqual(t.indexes, { a: 0, b: 1, c: 2 });
    });

    it('accepts an IColumn[]-shaped array (objects with .name)', () => {
        const t = new ReportTable([{ name: 'x' }, { name: 'y' }]);
        assert.deepEqual(t.columns, ['x', 'y']);
    });

    it('starts with no rows', () => {
        const t = new ReportTable(['a']);
        assert.deepEqual(t.rows, []);
        assert.deepEqual(t.value, []);
    });
});

describe('ReportTable.createRow', () => {
    it('creates a ReportRow attached to the table and tracks it', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        assert.ok(row instanceof ReportRow);
        assert.equal(t.rows.length, 1);
        assert.equal(t.rows[0], row);
        assert.equal(t.value.length, 1);
        assert.equal(t.value[0], row.value);
    });

    it('rows share table.value with their per-row .value', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        row.set('a', 'A');
        row.set('b', 'B');
        assert.deepEqual(t.value[0], ['A', 'B']);
    });
});

describe('ReportRow get/set by name and index', () => {
    it('round-trips a value via name', () => {
        const t = new ReportTable(['k']);
        const row = t.createRow();
        row.set('k', 42);
        assert.equal(row.get('k'), 42);
    });

    it('round-trips a value via index', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        row.setByIndex(1, 'B');
        assert.equal(row.getByIndex(1), 'B');
    });

    it('setObject() unwraps a value with .toObject()', () => {
        const t = new ReportTable(['k']);
        const row = t.createRow();
        const obj = { toObject: () => ({ unwrapped: true }) };
        row.setObject('k', obj);
        assert.deepEqual(row.get('k'), { unwrapped: true });
    });

    it('setObject() falls back to the raw value when no .toObject()', () => {
        const t = new ReportTable(['k']);
        const row = t.createRow();
        row.setObject('k', 'plain');
        assert.equal(row.get('k'), 'plain');
    });

    it('setArray() maps each element through .toObject()', () => {
        const t = new ReportTable(['k']);
        const row = t.createRow();
        row.setArray('k', [
            { toObject: () => 1 },
            { toObject: () => 2 },
        ]);
        assert.deepEqual(row.get('k'), [1, 2]);
    });

    it('setArray() preserves a null/undefined input', () => {
        const t = new ReportTable(['k']);
        const row = t.createRow();
        row.setArray('k', null);
        assert.equal(row.get('k'), null);
    });
});

describe('ReportRow.data / object', () => {
    it('data() returns the underlying values array', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        row.set('a', 1);
        row.set('b', 2);
        assert.equal(row.data(), row.value);
        assert.deepEqual(row.value, [1, 2]);
    });

    it('object() pairs each column name with its slot value', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        row.set('a', 'x');
        row.set('b', 'y');
        assert.deepEqual(row.object(), { a: 'x', b: 'y' });
    });
});

describe('ReportTable.getByIndex / setByIndex / data / object', () => {
    it('getByIndex/setByIndex address the right cell', () => {
        const t = new ReportTable(['a', 'b']);
        t.createRow();
        t.setByIndex(0, 1, 'B');
        assert.equal(t.getByIndex(0, 1), 'B');
    });

    it('data() returns { columns, rows: matrix }', () => {
        const t = new ReportTable(['a', 'b']);
        const r1 = t.createRow();
        const r2 = t.createRow();
        r1.set('a', 1); r1.set('b', 2);
        r2.set('a', 3); r2.set('b', 4);
        const out = t.data();
        assert.deepEqual(out.columns, ['a', 'b']);
        assert.deepEqual(out.rows, [[1, 2], [3, 4]]);
    });

    it('object() returns one object per row keyed by column name', () => {
        const t = new ReportTable(['a', 'b']);
        const r1 = t.createRow();
        r1.set('a', 1); r1.set('b', 2);
        const r2 = t.createRow();
        r2.set('a', 3); r2.set('b', 4);
        assert.deepEqual(t.object(), [
            { a: 1, b: 2 },
            { a: 3, b: 4 },
        ]);
    });
});
