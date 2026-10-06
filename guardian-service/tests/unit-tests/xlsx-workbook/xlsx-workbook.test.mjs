import assert from 'node:assert/strict';
import { Workbook, Range } from '../../../dist/xlsx/models/workbook.js';

describe('Range', () => {
    it('captures start/end coords + s/e IPoint shape', () => {
        const r = new Range(2, 3, 5, 7);
        assert.equal(r.startColumn, 2);
        assert.equal(r.startRow, 3);
        assert.equal(r.endColumn, 5);
        assert.equal(r.endRow, 7);
        assert.deepEqual(r.s, { r: 3, c: 2 });
        assert.deepEqual(r.e, { r: 7, c: 5 });
    });

    it('Range.fromColumns builds a horizontal range with shared row', () => {
        const r = Range.fromColumns(2, 5, 4);
        assert.equal(r.startColumn, 2);
        assert.equal(r.startRow, 4);
        assert.equal(r.endColumn, 5);
        assert.equal(r.endRow, 4);
    });

    it('Range.fromRows builds a vertical range with shared column', () => {
        const r = Range.fromRows(3, 7, 2);
        assert.equal(r.startColumn, 2);
        assert.equal(r.startRow, 3);
        assert.equal(r.endColumn, 2);
        assert.equal(r.endRow, 7);
    });
});

describe('Workbook construction + sheet management', () => {
    it('starts empty (sheetLength=0, sheetNames=[])', () => {
        const w = new Workbook();
        assert.equal(w.sheetLength, 0);
        assert.deepEqual(w.sheetNames, []);
    });

    it('createWorksheet returns a Worksheet and adds to sheetNames', () => {
        const w = new Workbook();
        const sheet = w.createWorksheet('First');
        assert.ok(sheet);
        assert.equal(sheet.name, 'First');
        assert.equal(w.sheetLength, 1);
        assert.deepEqual(w.sheetNames, ['First']);
    });

    it('createWorksheet allows multiple sheets in insertion order', () => {
        const w = new Workbook();
        w.createWorksheet('A');
        w.createWorksheet('B');
        w.createWorksheet('C');
        assert.deepEqual(w.sheetNames, ['A', 'B', 'C']);
    });

    it('getWorksheet returns the named sheet, or null', () => {
        const w = new Workbook();
        w.createWorksheet('X');
        assert.equal(w.getWorksheet('X').name, 'X');
        assert.equal(w.getWorksheet('Y'), null);
    });

    it('getWorksheetByIndex returns the sheet at the index, or null', () => {
        const w = new Workbook();
        w.createWorksheet('A');
        w.createWorksheet('B');
        assert.equal(w.getWorksheetByIndex(0).name, 'A');
        assert.equal(w.getWorksheetByIndex(1).name, 'B');
        assert.equal(w.getWorksheetByIndex(99), null);
    });

    it('getWorksheets returns every sheet wrapped', () => {
        const w = new Workbook();
        w.createWorksheet('A');
        w.createWorksheet('B');
        const all = w.getWorksheets();
        assert.equal(all.length, 2);
        assert.deepEqual(all.map((s) => s.name), ['A', 'B']);
    });
});

describe('Worksheet.outColumnRange / outRowRange', () => {
    const w = new Workbook();
    const ws = w.createWorksheet('s');

    it('rejects column 0 / >255 / non-finite', () => {
        assert.equal(ws.outColumnRange(0), true);
        assert.equal(ws.outColumnRange(256), true);
        assert.equal(ws.outColumnRange(NaN), true);
        assert.equal(ws.outColumnRange(Infinity), true);
    });

    it('accepts column 1 to 255', () => {
        assert.equal(ws.outColumnRange(1), false);
        assert.equal(ws.outColumnRange(255), false);
    });

    it('rejects row 0 / >65000 / non-finite', () => {
        assert.equal(ws.outRowRange(0), true);
        assert.equal(ws.outRowRange(65001), true);
        assert.equal(ws.outRowRange(NaN), true);
    });

    it('accepts row 1 to 65000', () => {
        assert.equal(ws.outRowRange(1), false);
        assert.equal(ws.outRowRange(65000), false);
    });

    it('checkColumnRange/checkRowRange/checkRange throw on bad inputs', () => {
        assert.throws(() => ws.checkColumnRange(0), /Invalid column range/);
        assert.throws(() => ws.checkRowRange(0), /Invalid row range/);
        assert.throws(() => ws.checkRange(0, 1), /Invalid column range/);
        assert.throws(() => ws.checkRange(1, 0), /Invalid row range/);
    });
});

describe('Worksheet read/write cells', () => {
    it('setValue + getValue round-trips a primitive', () => {
        const w = new Workbook();
        const ws = w.createWorksheet('s');
        ws.setValue('hello', 1, 1);
        assert.equal(ws.getValue(1, 1), 'hello');
    });

    it('getFullPath wraps the cell address with the sheet name', () => {
        const w = new Workbook();
        const ws = w.createWorksheet('Demo Sheet');
        ws.setValue('x', 2, 3);
        const path = ws.getFullPath(2, 3);
        assert.ok(path.startsWith("'Demo Sheet'!"));
    });

    it('empty() returns true when all cells in the range are blank', () => {
        const w = new Workbook();
        const ws = w.createWorksheet('s');
        assert.equal(ws.empty(1, 5, 1), true);
    });

    it('empty() returns false once any cell has a value', () => {
        const w = new Workbook();
        const ws = w.createWorksheet('s');
        ws.setValue('x', 3, 1);
        assert.equal(ws.empty(1, 5, 1), false);
    });
});

describe('Workbook xlsx round-trip', () => {
    it('write() + read() preserve a sheet name', async () => {
        const w = new Workbook();
        w.createWorksheet('A');
        w.createWorksheet('B');
        const buf = await w.write();

        const w2 = new Workbook();
        await w2.read(buf);
        assert.deepEqual(w2.sheetNames, ['A', 'B']);
    });
});
