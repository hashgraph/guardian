import assert from 'node:assert/strict';
import {
    getTableFormulaNumbers,
    getTableFormulaScalar,
    resolveTableFormulaColumn,
    TABLE_FORMULA_MAX_ROWS
} from '../dist/helpers/table-field-core.js';

const declaredTable = (overrides = {}) => ({
    type: 'table',
    fileId: 'table-file',
    columnKeys: ['year', 'area.total', 'device'],
    columnNames: ['Year', 'Area', 'Device'],
    ...overrides
});

describe('Table columns in General formulas', () => {
    describe('resolveTableFormulaColumn', () => {
        it('reads a declared column from tablesPack without changing the Table marker', () => {
            const table = declaredTable();
            const original = structuredClone(table);
            const column = resolveTableFormulaColumn(table, 'area.total', {
                'table-file': {
                    columnKeys: ['year', 'area.total', 'device'],
                    rows: [
                        { year: '2020', 'area.total': '10', device: 'A' },
                        { year: '2021', 'area.total': '20', device: 'B' }
                    ]
                }
            });

            assert.deepEqual(column, {
                key: 'area.total',
                name: 'Area',
                values: ['10', '20']
            });
            assert.deepEqual(table, original);
        });

        it('reads the stored JSON-string Table marker from tablesPack', () => {
            const column = resolveTableFormulaColumn(JSON.stringify(declaredTable()), 'year', {
                'table-file': {
                    columnKeys: ['year'],
                    rows: [{ year: '2020' }, { year: '2021' }]
                }
            });

            assert.deepEqual(column, {
                key: 'year',
                name: 'Year',
                values: ['2020', '2021']
            });
        });

        it('reads inline rows in the browser shape', () => {
            const column = resolveTableFormulaColumn(declaredTable({
                rows: [
                    { year: '2020', 'area.total': '10', device: 'A' },
                    { year: '2021', 'area.total': '20', device: 'B' }
                ]
            }), 'device');

            assert.deepEqual(column, {
                key: 'device',
                name: 'Device',
                values: ['A', 'B']
            });
        });

        it('flattens the same declared column across repeatable Table fields', () => {
            const column = resolveTableFormulaColumn([
                declaredTable({ rows: [{ year: '2020' }] }),
                declaredTable({ rows: [{ year: '2021' }] })
            ], 'year');

            assert.deepEqual(column?.values, ['2020', '2021']);
        });

        it('does not expose a Table whose schema did not declare columns', () => {
            const column = resolveTableFormulaColumn({
                type: 'table',
                fileId: 'legacy-file'
            }, 'Year', {
                'legacy-file': {
                    columnKeys: ['Year'],
                    rows: [{ Year: '2020' }]
                }
            });

            assert.equal(column, null);
        });

        it('returns null for a key the declared Table does not carry', () => {
            assert.equal(resolveTableFormulaColumn(declaredTable(), 'missing'), null);
        });

        it('rejects a column above the General-formula row limit', () => {
            assert.throws(
                () => resolveTableFormulaColumn(declaredTable({
                    rows: [{ year: '2020' }, { year: '2021' }, { year: '2022' }]
                }), 'year', undefined, 2),
                /Table column "Year" has 3 rows; General formulas are limited to 2/
            );
            assert.equal(TABLE_FORMULA_MAX_ROWS, 10000);
        });
    });

    describe('getTableFormulaScalar', () => {
        it('recognizes unambiguous numbers', () => {
            assert.equal(getTableFormulaScalar('20'), 20);
            assert.equal(getTableFormulaScalar('-3.5'), -3.5);
            assert.equal(getTableFormulaScalar('1,5'), 1.5);
            assert.equal(getTableFormulaScalar(' 2e3 '), 2000);
        });

        it('keeps text and significant leading zeroes as text', () => {
            assert.equal(getTableFormulaScalar('A'), 'A');
            assert.equal(getTableFormulaScalar('00123'), '00123');
            assert.equal(getTableFormulaScalar('-00123'), '-00123');
            assert.equal(getTableFormulaScalar('10 ha'), '10 ha');
        });
    });

    describe('getTableFormulaNumbers', () => {
        it('replaces nonnumeric cells with zero without changing row positions', () => {
            assert.deepEqual(
                getTableFormulaNumbers(['10', 'n/a', '30', '', '1,5']),
                {
                    values: [10, 0, 30, 0, 1.5],
                    replacements: 2
                }
            );
        });

        it('counts leading-zero identifiers as replacements in a numeric function', () => {
            assert.deepEqual(
                getTableFormulaNumbers(['00123', '5']),
                {
                    values: [0, 5],
                    replacements: 1
                }
            );
        });
    });
});
