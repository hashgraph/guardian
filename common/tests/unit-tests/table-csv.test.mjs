import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
    parseCsvToTable,
    decodeGridFileText,
    hasDeclaredTableColumns,
    isTableWithFileId,
    parseIfJson
} from '../../dist/helpers/table-csv.js';

async function loadConfiguredMaxRows(value) {
    const previousValue = process.env.TABLE_EXPAND_MAX_ROWS;
    process.env.TABLE_EXPAND_MAX_ROWS = value;

    try {
        const moduleUrl = new URL('../../dist/helpers/table-csv.js', import.meta.url);
        moduleUrl.searchParams.set('maxRows', `${value}-${Date.now()}-${Math.random()}`);
        const module = await import(moduleUrl.href);
        return module.TABLE_EXPAND_MAX_ROWS;
    } finally {
        if (previousValue === undefined) {
            delete process.env.TABLE_EXPAND_MAX_ROWS;
        } else {
            process.env.TABLE_EXPAND_MAX_ROWS = previousValue;
        }
    }
}

describe('table-csv helpers moved into common', () => {
    it('uses the default maximum when its environment value is unsafe', async () => {
        assert.equal(await loadConfiguredMaxRows(''), 100000);
        assert.equal(await loadConfiguredMaxRows('   '), 100000);
        assert.equal(await loadConfiguredMaxRows('invalid'), 100000);
        assert.equal(await loadConfiguredMaxRows('-1'), 100000);
    });

    it('preserves explicit zero as the no-ceiling value', async () => {
        assert.equal(await loadConfiguredMaxRows('0'), 0);
    });

    it('exports the helpers the policy service re-exports', () => {
        assert.equal(typeof parseCsvToTable, 'function');
        assert.equal(typeof decodeGridFileText, 'function');
        assert.equal(typeof hasDeclaredTableColumns, 'function');
        assert.equal(typeof isTableWithFileId, 'function');
        assert.equal(typeof parseIfJson, 'function');
    });

    describe('parseCsvToTable', () => {
        it('keys rows by the first row when no declared keys are given', () => {
            const { columnKeys, rows } = parseCsvToTable('a,b,c\n1,2,3\n4,5,6');
            assert.deepEqual(columnKeys, ['a', 'b', 'c']);
            assert.deepEqual(rows, [
                { a: '1', b: '2', c: '3' },
                { a: '4', b: '5', c: '6' }
            ]);
        });

        it('keys rows by the declared keys and drops the display-name header', () => {
            const { columnKeys, rows } = parseCsvToTable(
                'Year,CO2 (tonnes)\n2023,42\n2024,45',
                ',',
                ['year', 'co2_tonnes']
            );
            assert.deepEqual(columnKeys, ['year', 'co2_tonnes']);
            assert.deepEqual(rows, [
                { year: '2023', co2_tonnes: '42' },
                { year: '2024', co2_tonnes: '45' }
            ]);
        });

        it('uses the declared width for missing and extra cells', () => {
            const { rows } = parseCsvToTable('A,B,C\n1\n2,3,4', ',', ['first', 'second']);
            assert.deepEqual(rows, [
                { first: '1', second: '' },
                { first: '2', second: '3' }
            ]);
        });

        it('returns empty result for empty input', () => {
            const { columnKeys, rows } = parseCsvToTable('');
            assert.deepEqual(columnKeys, []);
            assert.deepEqual(rows, []);
        });

        it('honours a non-comma delimiter', () => {
            const { columnKeys, rows } = parseCsvToTable('a;b\n1;2', ';');
            assert.deepEqual(columnKeys, ['a', 'b']);
            assert.deepEqual(rows, [{ a: '1', b: '2' }]);
        });

        it('returns only the requested row window and keeps the exact total', () => {
            const result = parseCsvToTable(
                'a,b\n1,one\n2,two\n3,three\n4,four',
                ',',
                undefined,
                { offset: 1, limit: 2 }
            );

            assert.deepEqual(result.rows, [
                { a: '2', b: 'two' },
                { a: '3', b: 'three' }
            ]);
            assert.equal(result.rowsTotal, 4);
        });

        it('counts every data row when the requested limit is zero', () => {
            const result = parseCsvToTable(
                'a\n1\n2\n3',
                ',',
                undefined,
                { limit: 0 }
            );

            assert.deepEqual(result.rows, []);
            assert.equal(result.rowsTotal, 3);
        });

        it('keeps a quoted line break inside one windowed row', () => {
            const result = parseCsvToTable(
                'id,text\n1,"first\nline"\n2,second',
                ',',
                undefined,
                { limit: 1 }
            );

            assert.deepEqual(result.rows, [{ id: '1', text: 'first\nline' }]);
            assert.equal(result.rowsTotal, 2);
        });

        it('applies declared keys and a column filter only to the requested window', () => {
            const result = parseCsvToTable(
                'Year,Amount\n2023,41\n2024,42\n2025,43',
                ',',
                ['year', 'amount'],
                { offset: 1, limit: 1, columns: ['amount'] }
            );

            assert.deepEqual(result.columnKeys, ['amount']);
            assert.deepEqual(result.rows, [{ amount: '42' }]);
            assert.equal(result.rowsTotal, 3);
        });
    });

    describe('decodeGridFileText', () => {
        it('reads a plain buffer', async () => {
            assert.equal(await decodeGridFileText(Buffer.from('a,b\n1,2')), 'a,b\n1,2');
        });

        it('unzips a gzipped buffer', async () => {
            assert.equal(await decodeGridFileText(gzipSync(Buffer.from('a,b\n1,2'))), 'a,b\n1,2');
        });
    });

    describe('hasDeclaredTableColumns', () => {
        it('is true only when both declaration lists are non-empty', () => {
            assert.equal(hasDeclaredTableColumns({ columnNames: ['Year'], columnKeys: ['year'] }), true);
            assert.equal(hasDeclaredTableColumns({ columnKeys: ['year'] }), false);
            assert.equal(hasDeclaredTableColumns({ columnNames: [], columnKeys: ['year'] }), false);
            assert.equal(hasDeclaredTableColumns({}), false);
        });
    });
});
