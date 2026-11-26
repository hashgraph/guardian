import { tableCsvFileName } from './table-csv-file-name';

describe('table CSV file name', () => {
    afterEach(() => vi.restoreAllMocks());

    it('preserves commas, spaces, parentheses and Unicode in the field label', () => {
        const label = 'BECH4,manure,y (one row per project instance and year)';
        expect(tableCsvFileName(label)).toBe(`${label}.csv`);
        expect(tableCsvFileName('Площадь участка')).toBe('Площадь участка.csv');
    });

    it('replaces each unsafe file name character with an underscore', () => {
        for (const character of ['\\', '/', ':', '*', '?', '"', '<', '>', '|', '\u0000', '\u001f', '\n']) {
            expect(tableCsvFileName(`a${character}b`)).toBe('a_b.csv');
        }
    });

    it('uses the timestamp when the field label is absent or blank', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1795624180459);
        for (const label of [undefined, null, '', '   ']) {
            expect(tableCsvFileName(label)).toBe('table-1795624180459.csv');
        }
    });

    it('trims surrounding spaces and adds the CSV extension to the whole label', () => {
        expect(tableCsvFileName('  Import table.csv here.  ')).toBe('Import table.csv here..csv');
        expect(tableCsvFileName('a/b:c')).toBe('a_b_c.csv');
    });
});
