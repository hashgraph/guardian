import assert from 'node:assert/strict';
import { TableHeader } from '../../../dist/xlsx/models/table-header.js';
import { EnumTable } from '../../../dist/xlsx/models/enum-table.js';

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
    it('exposes 3 headers (Schema name / Field name / Loaded to IPFS)', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        const titles = Array.from(t.headers).map((h) => h.title);
        assert.deepEqual(titles, ['Schema name', 'Field name', 'Loaded to IPFS']);
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

describe('EnumTable.setDefault + getRow/getCol', () => {
    it('places each header on its own row at start.c', () => {
        const t = new EnumTable({ c: 2, r: 5 });
        t.setDefault();
        assert.equal(t.getRow('Schema name'), 5);
        assert.equal(t.getRow('Field name'), 6);
        assert.equal(t.getRow('Loaded to IPFS'), 7);
    });

    it('setDefault assigns the column from start.c', () => {
        const t = new EnumTable({ c: 4, r: 1 });
        t.setDefault();
        assert.equal(t.getCol(), 4);
    });

    it('setDefault advances end by (start.c+2, start.r+headers.size)', () => {
        const t = new EnumTable({ c: 4, r: 1 });
        t.setDefault();
        assert.deepEqual(t.end, { c: 6, r: 4 });
    });
});

describe('EnumTable.setRow / setCol / setEnd', () => {
    it('setRow updates only the row of the named header', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        t.setRow('Schema name', 99);
        assert.equal(t.getRow('Schema name'), 99);
    });

    it('setCol updates the table column', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        t.setCol(7);
        assert.equal(t.getCol(), 7);
    });

    it('setEnd updates the end coordinate', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        t.setEnd(10, 20);
        assert.deepEqual(t.end, { c: 10, r: 20 });
    });
});

describe('EnumTable.getErrorHeader', () => {
    it('returns null when no required header is unplaced', () => {
        const t = new EnumTable({ c: 1, r: 1 });
        // Default headers are not required.
        assert.equal(t.getErrorHeader(), null);
    });
});
