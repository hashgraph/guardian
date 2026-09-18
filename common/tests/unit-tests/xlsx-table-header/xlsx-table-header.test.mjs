import assert from 'node:assert/strict';
import { TableHeader } from '../../../dist/xlsx/models/table-header.js';
import { EnumTable, SharedEnumTable } from '../../../dist/xlsx/models/enum-table.js';

describe('TableHeader', () => {
    it('captures title + required (default false) and starts unplaced', () => {
        const h = new TableHeader('Name');
        assert.equal(h.title, 'Name');
        assert.equal(h.required, false);
        assert.equal(h.column, -1);
        assert.equal(h.row, -1);
        assert.equal(h.style, null);
        assert.equal(h.width, null);
    });

    it('coerces required to boolean', () => {
        assert.equal(new TableHeader('X', 1).required, true);
        assert.equal(new TableHeader('X', 0).required, false);
        assert.equal(new TableHeader('X', undefined).required, false);
    });

    it('setStyle/setWidth chain and store the value', () => {
        const h = new TableHeader('X');
        const style = { font: { bold: true } };
        assert.equal(h.setStyle(style), h);
        assert.equal(h.setWidth(25), h);
        assert.equal(h.style, style);
        assert.equal(h.width, 25);
    });

    it('setPoint records column + row', () => {
        const h = new TableHeader('X');
        h.setPoint(3, 5);
        assert.equal(h.column, 3);
        assert.equal(h.row, 5);
    });
});

describe('EnumTable construction', () => {
    it('exposes 1 header (Loaded to IPFS)', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        const titles = Array.from(t.headers).map((h) => h.title);
        assert.deepEqual(titles, ['Loaded to IPFS']);
    });

    it('every header has a configured style and width=30', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        for (const header of t.headers) {
            assert.ok(header.style?.font);
            assert.equal(header.width, 30);
        }
    });

    it('start === end before setDefault is called', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        assert.deepEqual(t.end, t.start);
    });

    it('isHeader recognises the documented header titles', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        assert.equal(t.isHeader('Schema name'), true);
        assert.equal(t.isHeader('Field name'), true);
        assert.equal(t.isHeader('Loaded to IPFS'), true);
        assert.equal(t.isHeader('Random'), false);
    });
});

describe('EnumTable import path: setRow + getRow', () => {
    it('setRow places Loaded to IPFS at the row found in the file', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        t.setRow('Loaded to IPFS', 3);
        assert.equal(t.getRow('Loaded to IPFS'), 3);
    });

    it('getRow returns -1 before setRow is called', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        assert.equal(t.getRow('Loaded to IPFS'), -1);
    });
});

describe('SharedEnumTable column layout', () => {
    it('defines 3 columns in the correct order (Name / IPFS / Value)', () => {
        assert.equal(SharedEnumTable.COL_NAME, 1);
        assert.equal(SharedEnumTable.COL_IPFS, 2);
        assert.equal(SharedEnumTable.COL_VALUE, 3);
    });

    it('header row is 1 and first data row is 2', () => {
        assert.equal(SharedEnumTable.HEADER_ROW, 1);
        assert.equal(SharedEnumTable.FIRST_DATA_ROW, 2);
    });

    it('headerStyle and itemStyle have a font defined', () => {
        const t = new SharedEnumTable();
        assert.ok(t.headerStyle.font);
        assert.ok(t.itemStyle.font);
    });
});


