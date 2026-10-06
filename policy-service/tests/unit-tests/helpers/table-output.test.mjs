import assert from 'node:assert/strict';
import { decodeGridFileText, parseCsvToTable } from '@guardian/common';
import {
    buildCompactTableJson,
    buildTableOutputCsv,
    gzipTableCsv,
    isTableOutputValue,
    toTableCell
} from '../../../dist/policy-engine/helpers/table-output.js';

const columns = [
    { name: 'Year', key: 'year' },
    { name: 'CO2 (tonnes)', key: 'co2_tonnes' }
];

describe('@unit table output helpers', () => {
    describe('isTableOutputValue', () => {
        it('accepts the value the math worker writes', () => {
            assert.equal(isTableOutputValue({ type: 'table', rows: [] }), true);
        });

        it('rejects a stored table, a string and a value without rows', () => {
            assert.equal(isTableOutputValue({ type: 'table', rows: [], fileId: 'f1' }), false);
            assert.equal(isTableOutputValue('{"type":"table","rows":[]}'), false);
            assert.equal(isTableOutputValue({ type: 'table' }), false);
            assert.equal(isTableOutputValue({ rows: [] }), false);
        });
    });

    describe('toTableCell', () => {
        it('writes numbers, strings and booleans as they are', () => {
            assert.equal(toTableCell(42.5), '42.5');
            assert.equal(toTableCell('A'), 'A');
            assert.equal(toTableCell(true), 'true');
        });

        it('writes a missing value as an empty cell', () => {
            assert.equal(toTableCell(undefined), '');
            assert.equal(toTableCell(null), '');
        });

        it('writes a list or an object as JSON text', () => {
            assert.equal(toTableCell([1, 2]), '[1,2]');
            assert.equal(toTableCell({ a: 1 }), '{"a":1}');
        });
    });

    describe('buildTableOutputCsv', () => {
        it('starts with the declared column names and follows the declared order', () => {
            const csv = buildTableOutputCsv(columns, [
                { co2_tonnes: 42, year: 2020 },
                { year: 2021, co2_tonnes: '' }
            ]);
            assert.equal(csv, 'Year,CO2 (tonnes)\r\n2020,42\r\n2021,');
        });

        it('quotes a value that holds the delimiter', () => {
            const csv = buildTableOutputCsv(columns, [{ year: 2020, co2_tonnes: [1, 2] }]);
            assert.equal(csv, 'Year,CO2 (tonnes)\r\n2020,"[1,2]"');
        });

        it('writes only the header for a grid without rows', () => {
            assert.equal(buildTableOutputCsv(columns, []), 'Year,CO2 (tonnes)');
        });

        it('writes an empty line for a row that is not an object', () => {
            assert.equal(buildTableOutputCsv(columns, [5]), 'Year,CO2 (tonnes)\r\n,');
        });
    });

    describe('gzipTableCsv', () => {
        it('produces a file the table reader decodes under the declared keys', async () => {
            const csv = buildTableOutputCsv(columns, [{ year: 2020, co2_tonnes: 42 }]);
            const buffer = await gzipTableCsv(csv);

            assert.equal(buffer[0], 0x1f);
            assert.equal(buffer[1], 0x8b);

            const text = await decodeGridFileText(buffer);
            const table = parseCsvToTable(text, ',', ['year', 'co2_tonnes']);
            assert.deepEqual(table.rows, [{ year: '2020', co2_tonnes: '42' }]);
        });
    });

    describe('buildCompactTableJson', () => {
        it('matches the value the browser writes', () => {
            assert.equal(
                buildCompactTableJson('f1', 'cid1', columns),
                '{"type":"table","fileId":"f1","cid":"cid1","columnNames":["Year","CO2 (tonnes)"],"columnKeys":["year","co2_tonnes"]}'
            );
        });

        it('leaves the cid out in Dry Run', () => {
            assert.deepEqual(JSON.parse(buildCompactTableJson('f1', null, columns)), {
                type: 'table',
                fileId: 'f1',
                columnNames: ['Year', 'CO2 (tonnes)'],
                columnKeys: ['year', 'co2_tonnes']
            });
        });
    });
});
