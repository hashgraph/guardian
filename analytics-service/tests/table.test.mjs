import assert from 'node:assert/strict';
import { Table } from '../dist/helpers/table.js';

describe('Table — CSV builder', () => {
    it('produces a header line followed by quoted data rows', () => {
        const t = new Table('test');
        t.addHeader('name').addHeader('value');
        t.add('alice').add(1);
        t.addLine();
        t.add('bob').add(2);

        const csv = t.csv();
        const lines = csv.split('\r\n');
        assert.equal(lines[0], 'name,value');
        assert.equal(lines[1], '"alice","1"');
        assert.equal(lines[2], '"bob","2"');
    });

    it('records header metadata with row=1 and col index', () => {
        const t = new Table();
        t.addHeader('a').addHeader('b');
        assert.equal(t.headers.length, 2);
        assert.equal(t.headers[0].row, 1);
        assert.equal(t.headers[0].col, 1);
        assert.equal(t.headers[1].col, 2);
    });

    it("converts falsy values to '' (toString returns '' for null/undefined/0/'')", () => {
        const t = new Table();
        t.add(null).add(undefined).add(0).add('');
        const csv = t.csv();
        // No headers → starts with a leading newline then the data row.
        const dataRow = csv.split('\r\n').pop();
        assert.equal(dataRow, '"","","",""');
    });

    it('clear() resets headers and data', () => {
        const t = new Table();
        t.addHeader('h').add('x');
        t.clear();
        assert.equal(t.headers.length, 0);
        assert.equal(t.buffer.length, 1);
        assert.equal(t.buffer[0].length, 0);
    });

    it('exposes the buffer for direct inspection', () => {
        const t = new Table();
        t.add('a');
        t.addLine();
        t.add('b');
        assert.equal(t.buffer.length, 2);
        assert.equal(t.buffer[0][0], 'a');
        assert.equal(t.buffer[1][0], 'b');
    });

    it('preserves the supplied table name', () => {
        const t = new Table('analytics-export');
        assert.equal(t.name, 'analytics-export');
    });
});
