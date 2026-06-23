import assert from 'node:assert/strict';
import { parseCsv } from '../../../dist/helpers/custom-csv-parser.js';

describe('parseCsv', () => {
    it('parses a simple two-column CSV into objects keyed by header', () => {
        const records = parseCsv('name,age\nAlice,30\nBob,25');
        assert.deepEqual(records, [
            { name: 'Alice', age: '30' },
            { name: 'Bob', age: '25' },
        ]);
    });

    it('trims whitespace around headers and values', () => {
        const records = parseCsv(' a , b \n 1 , 2 ');
        assert.deepEqual(records, [{ a: '1', b: '2' }]);
    });

    it('fills missing trailing columns with empty string', () => {
        const records = parseCsv('a,b,c\n1,2');
        assert.deepEqual(records, [{ a: '1', b: '2', c: '' }]);
    });

    it('returns [] for input with only a header row', () => {
        assert.deepEqual(parseCsv('a,b'), []);
    });

    it('trims leading/trailing whitespace in the whole input', () => {
        const records = parseCsv('\n  a,b\n1,2\n  ');
        assert.deepEqual(records, [{ a: '1', b: '2' }]);
    });

    it('handles a single column', () => {
        assert.deepEqual(parseCsv('id\nx\ny'), [{ id: 'x' }, { id: 'y' }]);
    });
});
