import assert from 'node:assert/strict';
import { CSV } from '../../dist/analytics/compare/table/csv.js';
import { ReportRow } from '../../dist/analytics/compare/table/report-row.js';
import { ReportTable } from '../../dist/analytics/compare/table/report-table.js';
import { CompareUtils } from '../../dist/analytics/compare/utils/utils.js';

describe('CSV builder', () => {
    it('starts with the data-uri header', () => {
        assert.equal(new CSV().result().startsWith('data:text/csv'), true);
    });

    it('quotes added values and separates with commas', () => {
        const csv = new CSV().add('a').add('b').result();
        assert.ok(csv.endsWith('"a","b"'));
    });

    it('renders undefined as empty quoted cell', () => {
        const csv = new CSV().add(undefined).result();
        assert.ok(csv.endsWith('""'));
    });

    it('addLine resets the separator (no leading comma on the next row)', () => {
        const csv = new CSV().add('a').addLine().add('b').result();
        assert.ok(csv.includes('"a"\r\n"b"'));
    });

    it('clear restores the initial header', () => {
        const csv = new CSV();
        csv.add('x').addLine();
        csv.clear();
        assert.equal(csv.result(), 'data:text/csv;charset=utf-8;');
    });

    it('add returns this for chaining', () => {
        const csv = new CSV();
        assert.equal(csv.add('a'), csv);
        assert.equal(csv.addLine(), csv);
    });

    it('numbers are stringified inside quotes', () => {
        const csv = new CSV().add(5).result();
        assert.ok(csv.endsWith('"5"'));
    });
});

describe('ReportTable construction', () => {
    it('accepts plain string column names', () => {
        const t = new ReportTable(['a', 'b']);
        assert.deepEqual(t.columns, ['a', 'b']);
    });

    it('extracts name from column-object definitions', () => {
        const t = new ReportTable([{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }]);
        assert.deepEqual(t.columns, ['a', 'b']);
    });

    it('builds an index map of column->position', () => {
        const t = new ReportTable(['a', 'b', 'c']);
        assert.deepEqual(t.indexes, { a: 0, b: 1, c: 2 });
    });

    it('non-array columns produce an empty table', () => {
        const t = new ReportTable(null);
        assert.deepEqual(t.columns, []);
    });

    it('createRow appends a row and mirrors its value array', () => {
        const t = new ReportTable(['a']);
        const row = t.createRow();
        assert.equal(t.rows.length, 1);
        assert.equal(t.value[0], row.value);
    });
});

describe('ReportRow set/get by name and index', () => {
    it('set/get by column name', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        row.set('a', 1);
        row.set('b', 2);
        assert.equal(row.get('a'), 1);
        assert.equal(row.get('b'), 2);
    });

    it('set/get by index', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        row.setByIndex(1, 'X');
        assert.equal(row.getByIndex(1), 'X');
    });

    it('setObject serializes a value with toObject', () => {
        const t = new ReportTable(['a']);
        const row = t.createRow();
        row.setObject('a', { toObject: () => ({ k: 'v' }) });
        assert.deepEqual(row.get('a'), { k: 'v' });
    });

    it('setObject stores plain values directly', () => {
        const t = new ReportTable(['a']);
        const row = t.createRow();
        row.setObject('a', 42);
        assert.equal(row.get('a'), 42);
    });

    it('setArray maps each element via toObject', () => {
        const t = new ReportTable(['a']);
        const row = t.createRow();
        row.setArray('a', [{ toObject: () => 1 }, { toObject: () => 2 }]);
        assert.deepEqual(row.get('a'), [1, 2]);
    });

    it('setArray stores falsy value directly', () => {
        const t = new ReportTable(['a']);
        const row = t.createRow();
        row.setArray('a', null);
        assert.equal(row.get('a'), null);
    });

    it('row value array length matches column count', () => {
        const t = new ReportTable(['a', 'b', 'c']);
        const row = new ReportRow(t);
        assert.equal(row.value.length, 3);
    });

    it('data() returns the underlying value array', () => {
        const t = new ReportTable(['a']);
        const row = t.createRow();
        row.set('a', 7);
        assert.deepEqual(row.data(), [7]);
    });

    it('object() builds a column-keyed map', () => {
        const t = new ReportTable(['a', 'b']);
        const row = t.createRow();
        row.set('a', 1);
        row.set('b', 2);
        assert.deepEqual(row.object(), { a: 1, b: 2 });
    });
});

describe('ReportTable getByIndex/setByIndex/data/object', () => {
    it('set/get a cell by row+col index', () => {
        const t = new ReportTable(['a', 'b']);
        t.createRow();
        t.setByIndex(0, 1, 'Z');
        assert.equal(t.getByIndex(0, 1), 'Z');
    });

    it('data returns columns plus the value matrix', () => {
        const t = new ReportTable(['a']);
        const row = t.createRow();
        row.set('a', 9);
        const d = t.data();
        assert.deepEqual(d.columns, ['a']);
        assert.deepEqual(d.rows, [[9]]);
    });

    it('object maps each row to a column-keyed object', () => {
        const t = new ReportTable(['a']);
        t.createRow().set('a', 'val');
        assert.deepEqual(t.object(), [{ a: 'val' }]);
    });
});

describe('CompareUtils.tableToCsv', () => {
    it('writes labelled column headers then row data', () => {
        const table = new ReportTable([{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }]);
        const row = table.createRow();
        row.set('a', '1');
        row.set('b', '2');
        const csv = new CSV();
        CompareUtils.tableToCsv(csv, { columns: [{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }], report: [{ a: '1', b: '2' }] });
        const out = csv.result();
        assert.ok(out.includes('"A","B"'));
        assert.ok(out.includes('"1","2"'));
    });

    it('skips columns without a label', () => {
        const csv = new CSV();
        CompareUtils.tableToCsv(csv, { columns: [{ name: 'a', label: 'A' }, { name: 'hidden' }], report: [{ a: '1', hidden: 'x' }] });
        const out = csv.result();
        assert.ok(out.includes('"A"'));
        assert.equal(out.includes('hidden'), false);
    });
});

describe('CompareUtils.objectToCsv', () => {
    it('produces header row Index/Key/Value/Type', () => {
        const csv = CompareUtils.objectToCsv({ a: 1 });
        assert.ok(csv.result().includes('"Index","Key","Value","Type"'));
    });

    it('serializes nested objects and arrays recursively', () => {
        const csv = CompareUtils.objectToCsv({ a: { b: [1, 2] } });
        const out = csv.result();
        assert.ok(out.includes('"object"'));
        assert.ok(out.includes('"array"'));
    });

    it('renders scalar values with their typeof', () => {
        const csv = CompareUtils.objectToCsv({ n: 5, s: 'x', b: true });
        const out = csv.result();
        assert.ok(out.includes('"number"'));
        assert.ok(out.includes('"string"'));
        assert.ok(out.includes('"boolean"'));
    });
});
