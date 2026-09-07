import assert from 'node:assert/strict';
import {
    expandTablesInDocument,
    TABLE_EXPAND_DEFAULT_ROWS,
    TABLE_EXPAND_MAX_ROWS
} from '../../dist/helpers/table-csv.js';

const declaredValue = (fileId = 'f1') => JSON.stringify({
    type: 'table',
    fileId,
    columnNames: ['Year', 'CO2 (tonnes)'],
    columnKeys: ['year', 'co2_tonnes']
});

const legacyValue = (fileId = 'f2') => JSON.stringify({ type: 'table', fileId });

const declaredValue3 = (fileId = 'f3') => JSON.stringify({
    type: 'table',
    fileId,
    columnNames: ['Year', 'CO2 (tonnes)', 'Region'],
    columnKeys: ['year', 'co2_tonnes', 'region']
});

const csv = 'Year,CO2 (tonnes)\n2023,42\n2024,45';

const wideCsv = (rows) => 'Year,CO2 (tonnes),Region\n' + Array.from(
    { length: rows },
    (_, i) => `${2000 + i},${i},Europe`
).join('\n');

const loaderFor = (text, seen = []) => async (fileId) => {
    seen.push(fileId);
    return Buffer.from(text);
};

describe('expandTablesInDocument', () => {
    it('expands a declared table under its declared keys', async () => {
        const document = { credentialSubject: [{ field4: declaredValue() }] };

        const result = await expandTablesInDocument(document, loaderFor(csv));

        const table = result.credentialSubject[0].field4;
        assert.deepEqual(table.columnKeys, ['year', 'co2_tonnes']);
        assert.deepEqual(table.rows, [
            { year: '2023', co2_tonnes: '42' },
            { year: '2024', co2_tonnes: '45' }
        ]);
        assert.equal(table.expanded, true);
        assert.equal(table.fileId, 'f1');
    });

    it('expands an undeclared table under the file header, as it always read', async () => {
        const document = { field5: legacyValue() };

        const result = await expandTablesInDocument(document, loaderFor(csv));

        assert.deepEqual(result.field5.columnKeys, ['Year', 'CO2 (tonnes)']);
        assert.deepEqual(result.field5.rows, [
            { Year: '2023', 'CO2 (tonnes)': '42' },
            { Year: '2024', 'CO2 (tonnes)': '45' }
        ]);
    });

    it('never modifies the input document', async () => {
        const original = declaredValue();
        const document = { credentialSubject: [{ field4: original }] };

        await expandTablesInDocument(document, loaderFor(csv));

        assert.equal(document.credentialSubject[0].field4, original);
    });

    it('leaves a JSON string that is not a table exactly as it was', async () => {
        const notATable = JSON.stringify({ some: 'object' });
        const document = { other: notATable, list: '[1,2,3]' };

        const result = await expandTablesInDocument(document, loaderFor(csv));

        assert.equal(result, document);
        assert.equal(result.other, notATable);
        assert.equal(result.list, '[1,2,3]');
    });

    it('leaves a table with no fileId alone', async () => {
        const seen = [];
        const document = { field4: { type: 'table', columnKeys: ['a'] } };

        const result = await expandTablesInDocument(document, loaderFor(csv, seen));

        assert.deepEqual(seen, []);
        assert.equal(result, document);
    });

    it('returns the default window and says how much more there is', async () => {
        const document = { field4: declaredValue() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(5000)));

        assert.equal(result.field4.rows.length, TABLE_EXPAND_DEFAULT_ROWS);
        assert.equal(result.field4.rowsTotal, 5000);
        assert.equal(result.field4.rowsOffset, 0);
        assert.equal(result.field4.rowsRequested, TABLE_EXPAND_DEFAULT_ROWS);
        assert.equal(result.field4.rowsTruncated, true);
    });

    it('a table smaller than the default window comes back whole and untruncated', async () => {
        const document = { field4: declaredValue() };

        const result = await expandTablesInDocument(document, loaderFor(csv));

        assert.equal(result.field4.rows.length, 2);
        assert.equal(result.field4.rowsTotal, 2);
        assert.equal(result.field4.rowsTruncated, false);
    });

    it('pages through with offset and limit', async () => {
        const document = { field4: declaredValue() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(5000)), {
            offset: 4990,
            limit: 100
        });

        assert.equal(result.field4.rows.length, 10);
        assert.equal(result.field4.rowsOffset, 4990);
        assert.equal(result.field4.rowsRequested, 100);
        assert.equal(result.field4.rowsTotal, 5000);
        assert.equal(result.field4.rowsTruncated, false);
        assert.equal(result.field4.rows[0].year, '6990');
    });

    it('caps a limit larger than the server maximum', async () => {
        const document = { field4: declaredValue() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(3000)), {
            limit: TABLE_EXPAND_MAX_ROWS + 1000
        });

        assert.equal(result.field4.rows.length, 3000);
        assert.equal(result.field4.rowsTruncated, false);
        assert.equal(result.field4.rowsRequested, TABLE_EXPAND_MAX_ROWS);
    });

    it('returns only the requested columns', async () => {
        const document = { field4: declaredValue3() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(3)), {
            columns: ['co2_tonnes']
        });

        assert.deepEqual(result.field4.columnKeys, ['co2_tonnes']);
        assert.deepEqual(Object.keys(result.field4.rows[0]), ['co2_tonnes']);
        assert.equal(result.field4.rowsTotal, 3);
    });

    it('keeps the table order of columns, not the order asked for', async () => {
        const document = { field4: declaredValue3() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(3)), {
            columns: ['region', 'year']
        });

        assert.deepEqual(result.field4.columnKeys, ['year', 'region']);
    });

    it('ignores a column key no table carries, and says so in columnKeys', async () => {
        const document = { field4: declaredValue3() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(3)), {
            columns: ['co2_tonnes', 'not_a_column']
        });

        assert.deepEqual(result.field4.columnKeys, ['co2_tonnes']);
    });

    it('returns no rows at all when the filter matches nothing in that table', async () => {
        const document = { field5: legacyValue() };

        const result = await expandTablesInDocument(document, loaderFor(csv), {
            columns: ['co2_tonnes']
        });

        assert.deepEqual(result.field5.columnKeys, []);
        assert.deepEqual(result.field5.rows, []);
        assert.equal(result.field5.rowsTotal, 2);
    });

    it('filters each table by its own columns in one document', async () => {
        const document = { field4: declaredValue3(), field5: legacyValue() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(3)), {
            columns: ['co2_tonnes']
        });

        assert.deepEqual(result.field4.columnKeys, ['co2_tonnes']);
        assert.equal(result.field4.rows.length, 3);
        assert.deepEqual(result.field5.columnKeys, []);
        assert.deepEqual(result.field5.rows, []);
    });

    it('applies the window and the filter together', async () => {
        const document = { field4: declaredValue() };

        const result = await expandTablesInDocument(document, loaderFor(wideCsv(5000)), {
            offset: 10,
            limit: 5,
            columns: ['year']
        });

        assert.equal(result.field4.rows.length, 5);
        assert.deepEqual(result.field4.rows[0], { year: '2010' });
        assert.equal(result.field4.rowsTotal, 5000);
        assert.equal(result.field4.rowsTruncated, true);
    });

    it('returns a table whose file cannot be read in pointer form', async () => {
        const document = { field4: declaredValue() };

        const result = await expandTablesInDocument(document, async () => {
            throw new Error('gone');
        });

        assert.equal(result.field4.expanded, false);
        assert.equal(result.field4.expandSkipped, 'file-unavailable');
    });

    it('expands every table in the document, with no count cap', async () => {
        const seen = [];
        const fields = {};
        for (let i = 0; i < 60; i++) {
            fields[`field${i}`] = declaredValue(`f${i}`);
        }

        const result = await expandTablesInDocument(fields, loaderFor(csv, seen));

        const expanded = Object.values(result).filter((table) => table.expanded === true);
        assert.equal(expanded.length, 60);
        assert.equal(seen.length, 60);
    });

    it('one unreadable file does not stop the tables beside it', async () => {
        const document = { good: declaredValue('ok'), bad: declaredValue('missing') };

        const result = await expandTablesInDocument(document, async (fileId) => {
            if (fileId === 'missing') {
                throw new Error('gone');
            }
            return Buffer.from(csv);
        });

        assert.equal(result.good.expanded, true);
        assert.equal(result.bad.expanded, false);
        assert.equal(result.bad.expandSkipped, 'file-unavailable');
    });
});
