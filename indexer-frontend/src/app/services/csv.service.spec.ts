import { CsvService } from './csv.service';

describe('CsvService', () => {
    let service: CsvService;

    beforeEach(() => {
        service = new CsvService();
    });

    it('keeps the first row and positional keys without declared columns', () => {
        const result = service.parseCsvToTable('Year,Amount\n2024,42');

        expect(result.columnKeys).toEqual(['C1', 'C2']);
        expect(result.rows).toEqual([
            { C1: 'Year', C2: 'Amount' },
            { C1: '2024', C2: '42' }
        ]);
    });

    it('skips the header and uses declared keys', () => {
        const result = service.parseCsvToTable(
            'Year,Amount\n2024,42',
            ',',
            ['year', 'amount']
        );

        expect(result.columnKeys).toEqual(['year', 'amount']);
        expect(result.rows).toEqual([{ year: '2024', amount: '42' }]);
    });

    it('uses the declared width for ragged and wider rows', () => {
        const result = service.parseCsvToTable(
            'Year,Amount,Ignored\n2024\n2025,43,extra',
            ',',
            ['year', 'amount']
        );

        expect(result.rows).toEqual([
            { year: '2024', amount: '' },
            { year: '2025', amount: '43' }
        ]);
    });

    it('preserves an empty row for a declared table', () => {
        const result = service.parseCsvToTable('Year,Amount\n,', ',', ['year', 'amount']);

        expect(result.rows).toEqual([{ year: '', amount: '' }]);
    });
});
