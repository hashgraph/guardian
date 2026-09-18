import { assert } from 'chai';
import {
    Workbook,
    Worksheet,
    Range,
    Cell,
    Hyperlink
} from '../../../dist/xlsx/models/workbook.js';

describe('Range', () => {
    it('constructor sets corners and s/e points', () => {
        const r = new Range(2, 3, 5, 7);
        assert.equal(r.startColumn, 2);
        assert.equal(r.startRow, 3);
        assert.equal(r.endColumn, 5);
        assert.equal(r.endRow, 7);
        assert.deepEqual(r.s, { r: 3, c: 2 });
        assert.deepEqual(r.e, { r: 7, c: 5 });
    });

    it('fromColumns builds a single-row horizontal range', () => {
        const r = Range.fromColumns(1, 4, 9);
        assert.equal(r.startRow, 9);
        assert.equal(r.endRow, 9);
        assert.equal(r.startColumn, 1);
        assert.equal(r.endColumn, 4);
    });

    it('fromRows builds a single-column vertical range', () => {
        const r = Range.fromRows(2, 8, 3);
        assert.equal(r.startColumn, 3);
        assert.equal(r.endColumn, 3);
        assert.equal(r.startRow, 2);
        assert.equal(r.endRow, 8);
    });
});

describe('Hyperlink', () => {
    it('constructor builds an internal link string', () => {
        const h = new Hyperlink('Sheet1', 'B2');
        assert.equal(h.worksheet, 'Sheet1');
        assert.equal(h.cell, 'B2');
        assert.equal(h.link, "#'Sheet1'!B2");
    });

    it('from parses a #\'sheet\'!cell style link', () => {
        const h = Hyperlink.from("#'Data'!C5");
        assert.isNotNull(h);
        assert.equal(h.worksheet, 'Data');
        assert.equal(h.cell, 'C5');
    });

    it('from strips a leading hash without quotes', () => {
        const h = Hyperlink.from('#Sheet2!A1');
        assert.equal(h.worksheet, 'Sheet2');
        assert.equal(h.cell, 'A1');
    });

    it('from strips double quotes around the sheet name', () => {
        const h = Hyperlink.from('#"My Sheet"!Z9');
        assert.equal(h.worksheet, 'My Sheet');
        assert.equal(h.cell, 'Z9');
    });

    it('from returns null for empty input', () => {
        assert.isNull(Hyperlink.from(''));
        assert.isNull(Hyperlink.from(null));
    });

    it('from returns null when there is no cell part', () => {
        assert.isNull(Hyperlink.from('#Sheet1'));
    });

    it('round-trips a constructed Hyperlink through from', () => {
        const original = new Hyperlink('S', 'A1');
        const parsed = Hyperlink.from(original.link);
        assert.equal(parsed.worksheet, 'S');
        assert.equal(parsed.cell, 'A1');
    });
});

describe('Worksheet range checks', () => {
    let ws;
    beforeEach(() => {
        const wb = new Workbook();
        ws = wb.createWorksheet('S1');
    });

    it('outColumnRange flags non-finite / out of bounds columns', () => {
        assert.isTrue(ws.outColumnRange(0));
        assert.isTrue(ws.outColumnRange(256));
        assert.isTrue(ws.outColumnRange(NaN));
        assert.isFalse(ws.outColumnRange(1));
        assert.isFalse(ws.outColumnRange(255));
    });

    it('outRowRange flags non-finite / out of bounds rows', () => {
        assert.isTrue(ws.outRowRange(0));
        assert.isTrue(ws.outRowRange(65001));
        assert.isFalse(ws.outRowRange(1));
        assert.isFalse(ws.outRowRange(65000));
    });

    it('checkColumnRange / checkRowRange throw for invalid', () => {
        assert.throws(() => ws.checkColumnRange(0), /Invalid column range/);
        assert.throws(() => ws.checkRowRange(0), /Invalid row range/);
    });

    it('checkRange does not throw for valid coords', () => {
        assert.doesNotThrow(() => ws.checkRange(1, 1));
    });
});

describe('Worksheet cell access + values', () => {
    let wb;
    let ws;
    beforeEach(() => {
        wb = new Workbook();
        ws = wb.createWorksheet('Data');
    });

    it('setValue/getValue round-trips a primitive', () => {
        ws.setValue('hello', 1, 1);
        assert.equal(ws.getValue(1, 1), 'hello');
    });

    it('getCell returns a Cell instance', () => {
        assert.instanceOf(ws.getCell(1, 1), Cell);
    });

    it('empty returns true for a blank row range', () => {
        assert.isTrue(ws.empty(1, 4, 2));
    });

    it('empty returns false once a value exists', () => {
        ws.setValue('x', 2, 3);
        assert.isFalse(ws.empty(1, 4, 3));
    });

    it('getFullPath includes the sheet name', () => {
        const path = ws.getFullPath(1, 1);
        assert.match(path, /^'Data'!/);
    });
});

describe('Cell behaviour', () => {
    let ws;
    beforeEach(() => {
        const wb = new Workbook();
        ws = wb.createWorksheet('C');
    });

    it('setValue returns the Cell (chainable) and isValue is true', () => {
        const cell = ws.getCell(1, 1);
        assert.strictEqual(cell.setValue(5), cell);
        assert.isTrue(cell.isValue());
    });

    it('isValue false for empty cell', () => {
        assert.isFalse(ws.getCell(2, 2).isValue());
    });

    it('setFormulae / getFormulae / isFormulae', () => {
        const cell = ws.getCell(1, 2);
        cell.setFormulae('SUM(A1:A2)', 7);
        assert.equal(cell.getFormulae(), 'SUM(A1:A2)');
        assert.isTrue(cell.isFormulae());
        assert.equal(cell.getResult(), 7);
    });

    it('setFormulae without result still records the formula', () => {
        const cell = ws.getCell(1, 3);
        cell.setFormulae('A1+1');
        assert.equal(cell.getFormulae(), 'A1+1');
    });

    it('setList / getList round-trips items', () => {
        const cell = ws.getCell(1, 4);
        cell.setList(['a', 'b', 'c']);
        assert.deepEqual(cell.getList(), ['a', 'b', 'c']);
    });

    it('getList returns null when no list validation', () => {
        assert.isNull(ws.getCell(2, 4).getList());
    });

    it('setFormat / getFormat round-trips', () => {
        const cell = ws.getCell(1, 5);
        cell.setFormat('0.00');
        assert.equal(cell.getFormat(), '0.00');
    });

    it('getValue extracts text from a hyperlink value object', () => {
        const cell = ws.getCell(1, 6);
        cell.setLink('Click', new Hyperlink('C', 'A1'));
        assert.equal(cell.getValue(), 'Click');
    });

    it('getLink returns a Hyperlink for a linked cell', () => {
        const cell = ws.getCell(1, 7);
        cell.setLink('Go', new Hyperlink('C', 'B2'));
        const link = cell.getLink();
        assert.isNotNull(link);
        assert.equal(link.cell, 'B2');
    });

    it('getLink returns null for a plain cell', () => {
        assert.isNull(ws.getCell(2, 7).getLink());
    });

    it('address reflects the cell coordinate', () => {
        const cell = ws.getCell(1, 1);
        assert.isString(cell.address);
    });
});

describe('Workbook worksheet management', () => {
    it('createWorksheet then getWorksheet returns same name', () => {
        const wb = new Workbook();
        wb.createWorksheet('Alpha');
        const ws = wb.getWorksheet('Alpha');
        assert.instanceOf(ws, Worksheet);
        assert.equal(ws.name, 'Alpha');
    });

    it('getWorksheet returns null for unknown sheet', () => {
        const wb = new Workbook();
        assert.isNull(wb.getWorksheet('Nope'));
    });

    it('getWorksheetByIndex returns null when out of range', () => {
        const wb = new Workbook();
        assert.isNull(wb.getWorksheetByIndex(99));
    });

    it('sheetNames and sheetLength reflect created worksheets', () => {
        const wb = new Workbook();
        wb.createWorksheet('One');
        wb.createWorksheet('Two');
        assert.equal(wb.sheetLength, 2);
        assert.includeMembers(wb.sheetNames, ['One', 'Two']);
    });

    it('getWorksheets maps all sheets to Worksheet wrappers', () => {
        const wb = new Workbook();
        wb.createWorksheet('A');
        wb.createWorksheet('B');
        const list = wb.getWorksheets();
        assert.equal(list.length, 2);
        for (const ws of list) {
            assert.instanceOf(ws, Worksheet);
        }
    });
});
