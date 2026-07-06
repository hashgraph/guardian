import assert from 'node:assert/strict';
import { parseCsv } from '../../../dist/helpers/custom-csv-parser.js';

describe('parseCsv — edge & quirks', () => {
    it('drops values beyond the declared header count', () => {
        assert.deepEqual(parseCsv('a,b\n1,2,3'), [{ a: '1', b: '2' }]);
    });

    it('collapses duplicate headers so the last column wins', () => {
        assert.deepEqual(parseCsv('a,a\n1,2'), [{ a: '2' }]);
    });

    it('tolerates CRLF line endings by trimming the trailing carriage return', () => {
        assert.deepEqual(parseCsv('a,b\r\n1,2\r\n3,4'), [
            { a: '1', b: '2' },
            { a: '3', b: '4' },
        ]);
    });

    it('does not honour quotes around embedded commas (naive split limitation)', () => {
        assert.deepEqual(parseCsv('a,b\n"x,y",2'), [{ a: '"x', b: 'y"' }]);
    });

    it('returns [] for empty or whitespace-only input', () => {
        assert.deepEqual(parseCsv(''), []);
        assert.deepEqual(parseCsv('   '), []);
    });
});
