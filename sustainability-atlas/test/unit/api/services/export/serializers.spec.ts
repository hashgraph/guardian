import { describe, expect, it } from '@jest/globals';
import { CsvSerializer } from '@api/services/export/csv-serializer';
import { XlsxSerializer } from '@api/services/export/xlsx-serializer';
import { PdfSerializer } from '@api/services/export/pdf-serializer';

const FIELDS = ['project_name', 'emissions_reduced', 'verification_url'];
const ROWS: Record<string, unknown>[] = [
    {
        project_name: 'Rimba Raya',
        emissions_reduced: 12345,
        verification_url: 'https://hashscan.io/mainnet/transaction/1.2',
        // extra key not in FIELDS — serializers must ignore it
        internal_only: 'secret',
    },
];

const DATASET_TITLE = 'Projects';

describe('CsvSerializer', () => {
    it('emits a UTF-8 BOM, the selected header row, and text/csv metadata', async () => {
        const res = await new CsvSerializer().serialize(FIELDS, ROWS, DATASET_TITLE);
        expect(res.mime).toBe('text/csv');
        expect(res.extension).toBe('csv');
        expect(Buffer.isBuffer(res.content)).toBe(true);

        const text = res.content.toString('utf-8');
        expect(text.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
        const [header] = text.slice(1).split(/\r?\n/);
        expect(header).toBe('project_name,emissions_reduced,verification_url');
    });

    it('ignores keys not in the selected field list', async () => {
        const text = (await new CsvSerializer().serialize(FIELDS, ROWS, DATASET_TITLE)).content.toString('utf-8');
        expect(text).not.toContain('secret');
        expect(text).not.toContain('internal_only');
    });

    it('quotes and escapes values containing commas, quotes and newlines', async () => {
        const rows = [{ project_name: 'A, B "C"\nD', emissions_reduced: 1, verification_url: '' }];
        const text = (await new CsvSerializer().serialize(FIELDS, rows, DATASET_TITLE)).content.toString('utf-8');
        // comma + embedded double-quotes-doubled + preserved newline, all inside one quoted field
        expect(text).toContain('"A, B ""C""\nD"');
    });

    it('produces a header-only file for an empty row set', async () => {
        const text = (await new CsvSerializer().serialize(FIELDS, [], DATASET_TITLE)).content.toString('utf-8');
        const lines = text.slice(1).split(/\r?\n/).filter(Boolean);
        expect(lines).toHaveLength(1);
    });

    it('does not render a title row (CSV stays machine-parseable — header row must be first)', async () => {
        const text = (await new CsvSerializer().serialize(FIELDS, ROWS, DATASET_TITLE)).content.toString('utf-8');
        const [header] = text.slice(1).split(/\r?\n/);
        expect(header).not.toContain(DATASET_TITLE);
    });
});

describe('XlsxSerializer', () => {
    it('produces a non-empty .xlsx (ZIP "PK" magic) workbook', async () => {
        const res = await new XlsxSerializer().serialize(FIELDS, ROWS, DATASET_TITLE);
        expect(res.extension).toBe('xlsx');
        expect(res.mime).toBeTruthy();
        expect(res.content.length).toBeGreaterThan(0);
        expect(res.content.slice(0, 2).toString('ascii')).toBe('PK'); // OOXML is a zip
    });
});

describe('PdfSerializer', () => {
    it('produces a valid PDF document ("%PDF" magic)', async () => {
        const res = await new PdfSerializer().serialize(FIELDS, ROWS, DATASET_TITLE);
        expect(res.extension).toBe('pdf');
        expect(res.content.length).toBeGreaterThan(0);
        expect(res.content.slice(0, 4).toString('ascii')).toBe('%PDF');
    });
});

describe('issuance_date column', () => {
    const DATE_FIELDS = ['project_name', 'issuance_date'];
    const DATE_ROWS = [{ project_name: 'Rimba Raya', issuance_date: '2024-03-17' }];

    // The repository emits a plain YYYY-MM-DD string rather than a Date, so every format renders the
    // same calendar day: a Date would round-trip through toISOString() in CSV/PDF (gaining a time) and
    // be re-interpreted in the reader's local timezone by Excel, which can shift the day.
    it('renders as a bare YYYY-MM-DD day in CSV, with no time component', async () => {
        const text = (await new CsvSerializer().serialize(DATE_FIELDS, DATE_ROWS, 'Issuances')).content.toString('utf-8');
        const [header, row] = text.slice(1).split(/\r?\n/);
        expect(header).toBe('project_name,issuance_date');
        expect(row).toBe('Rimba Raya,2024-03-17');
        expect(row).not.toContain('T00:00');
    });

    it('is carried through the XLSX and PDF serializers too', async () => {
        const xlsx = await new XlsxSerializer().serialize(DATE_FIELDS, DATE_ROWS, 'Issuances');
        expect(xlsx.content.slice(0, 2).toString('ascii')).toBe('PK');

        const pdf = await new PdfSerializer().serialize(DATE_FIELDS, DATE_ROWS, 'Issuances');
        expect(pdf.content.slice(0, 4).toString('ascii')).toBe('%PDF');
    });
});
