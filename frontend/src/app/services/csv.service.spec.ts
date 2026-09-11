import { TestBed } from '@angular/core/testing';
import { CsvService } from './csv.service';

describe('CsvService', () => {
    let service: CsvService;

    const declared = [
        { name: 'Year', key: 'year' },
        { name: 'CO2 (tonnes)', key: 'co2_tonnes' },
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CsvService);
    });

    describe('parseCsvToTable', () => {
        it('keeps every row and invents the keys when no stored keys are given', () => {
            const parsed = service.parseCsvToTable('year,co2\n2023,42');

            expect(parsed.columnKeys).toEqual(['C1', 'C2']);
            expect(parsed.rows).toEqual([
                { C1: 'year', C2: 'co2' },
                { C1: '2023', C2: '42' },
            ]);
        });

        it('skips row one and uses the stored keys when they are given', () => {
            const parsed = service.parseCsvToTable('Year,CO2 (tonnes)\n2023,42', ',', ['year', 'co2_tonnes']);

            expect(parsed.columnKeys).toEqual(['year', 'co2_tonnes']);
            expect(parsed.rows).toEqual([{ year: '2023', co2_tonnes: '42' }]);
        });

        it('keeps an empty row of a single-column file when the keys are stored', () => {
            const parsed = service.parseCsvToTable('Only\n\n\nhello', ',', ['only']);

            expect(parsed.rows).toEqual([
                { only: '' },
                { only: '' },
                { only: 'hello' },
            ]);
        });

        it('still drops empty lines when no keys are stored', () => {
            const parsed = service.parseCsvToTable('\n\nhello');

            expect(parsed.rows).toEqual([{ C1: 'hello' }]);
        });

        it('drops the empty row a terminating newline adds', () => {
            const parsed = service.parseCsvToTable('Year,CO2\r\n2021,10\r\n', ',', ['year', 'co2']);

            expect(parsed.rows).toEqual([{ year: '2021', co2: '10' }]);
        });

        it('drops the empty row a terminating CR adds, not only LF and CRLF', () => {
            const parsed = service.parseCsvToTable('Year,CO2\r2021,10\r', ',', ['year', 'co2']);

            expect(parsed.rows).toEqual([{ year: '2021', co2: '10' }]);
        });

        it('leaves the last row alone when a CR-separated file does not end in one', () => {
            const parsed = service.parseCsvToTable('Year,CO2\r2021,10\r,', ',', ['year', 'co2']);

            expect(parsed.rows).toEqual([{ year: '2021', co2: '10' }, { year: '', co2: '' }]);
        });

        it('keeps a blank row the user left at the end of a one-column table', () => {
            const parsed = service.parseCsvToTable('Only\nhello\n\n', ',', ['only']);

            expect(parsed.rows).toEqual([{ only: 'hello' }, { only: '' }]);
        });

        it('leaves the last row alone when the file does not end in a newline', () => {
            const parsed = service.parseCsvToTable('Only\nhello\n\nlast', ',', ['only']);

            expect(parsed.rows).toEqual([{ only: 'hello' }, { only: '' }, { only: 'last' }]);
        });

        it('loses a blank last row through a round trip of a one-column table, and that is the trade', () => {
            const written = service.buildCsvFromTable(['only'], [{ only: 'hello' }, { only: '' }], ',', ['Only']);
            const parsed = service.parseCsvToTable(written, ',', ['only']);

            expect(parsed.rows).toEqual([{ only: 'hello' }]);
        });

        it('keeps every blank row that is not the last one through a round trip', () => {
            const rows = [{ only: '' }, { only: '' }, { only: 'hello' }];
            const written = service.buildCsvFromTable(['only'], rows, ',', ['Only']);
            const parsed = service.parseCsvToTable(written, ',', ['only']);

            expect(parsed.rows).toEqual(rows);
        });

        it('keeps every row of a multi-column table through a round trip, blanks included', () => {
            const rows = [
                { year: '2023', co2: '42' },
                { year: '', co2: '' },
                { year: '2025', co2: '48' },
            ];
            const written = service.buildCsvFromTable(['year', 'co2'], rows, ',', ['Year', 'CO2']);
            const parsed = service.parseCsvToTable(written, ',', ['year', 'co2']);

            expect(parsed.rows).toEqual(rows);
        });

        it('takes the column count from the stored keys, not from the widest row', () => {
            const parsed = service.parseCsvToTable('a,b,c\n1,2', ',', ['a', 'b', 'c']);

            expect(parsed.rows).toEqual([{ a: '1', b: '2', c: '' }]);
        });
    });

    describe('buildCsvFromTable', () => {
        it('writes no header line by default', () => {
            const csv = service.buildCsvFromTable(['year', 'co2_tonnes'], [{ year: '2023', co2_tonnes: '42' }]);

            expect(csv).toBe('2023,42');
        });

        it('writes the given labels as row one', () => {
            const csv = service.buildCsvFromTable(
                ['year', 'co2_tonnes'],
                [{ year: '2023', co2_tonnes: '42' }],
                ',',
                ['Year', 'CO2 (tonnes)']
            );

            expect(csv).toBe('Year,CO2 (tonnes)\r\n2023,42');
        });

        it('quotes a label that contains the separator', () => {
            const csv = service.buildCsvFromTable(
                ['year', 'co2_tonnes'],
                [{ year: '2023', co2_tonnes: '42' }],
                ',',
                ['Year', 'CO2, tonnes']
            );

            expect(csv).toBe('Year,"CO2, tonnes"\r\n2023,42');
        });
    });

    describe('applyDeclaredColumns', () => {
        it('maps by position and ignores what the file calls its columns', () => {
            const uploaded = service.parseCsvToTable('2023,42');

            const table = service.applyDeclaredColumns(uploaded, declared);

            expect(table.columnKeys).toEqual(['year', 'co2_tonnes']);
            expect(table.rows).toEqual([{ year: '2023', co2_tonnes: '42' }]);
        });

        it('drops a first row that repeats the declared names', () => {
            const uploaded = service.parseCsvToTable('Year,CO2 (tonnes)\n2023,42');

            const table = service.applyDeclaredColumns(uploaded, declared);

            expect(table.rows).toEqual([{ year: '2023', co2_tonnes: '42' }]);
        });

        it('drops a first row that repeats the declared keys', () => {
            const uploaded = service.parseCsvToTable('year,co2_tonnes\n2023,42');

            const table = service.applyDeclaredColumns(uploaded, declared);

            expect(table.rows).toEqual([{ year: '2023', co2_tonnes: '42' }]);
        });

        it('keeps a first row of data', () => {
            const uploaded = service.parseCsvToTable('2023,42\n2024,43');

            const table = service.applyDeclaredColumns(uploaded, declared);

            expect(table.rows).toEqual([
                { year: '2023', co2_tonnes: '42' },
                { year: '2024', co2_tonnes: '43' },
            ]);
        });

        it('keeps a first row where only some cells match', () => {
            const uploaded = service.parseCsvToTable('year,42\n2024,43');

            const table = service.applyDeclaredColumns(uploaded, declared);

            expect(table.rows.length).toBe(2);
            expect(table.rows[0]).toEqual({ year: 'year', co2_tonnes: '42' });
        });

        it('round trips through a file written with a names header', () => {
            const uploaded = service.parseCsvToTable('2023,42');
            const table = service.applyDeclaredColumns(uploaded, declared);
            const names = declared.map((column) => column.name);

            const csv = service.buildCsvFromTable(table.columnKeys, table.rows, ',', names);
            const reread = service.parseCsvToTable(csv, ',', table.columnKeys);

            expect(reread.columnKeys).toEqual(table.columnKeys);
            expect(reread.rows).toEqual(table.rows);
        });
    });
});
