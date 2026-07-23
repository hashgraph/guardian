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

describe('CsvSerializer', () => {
    it('emits a UTF-8 BOM, the selected header row, and text/csv metadata', async () => {
        const res = await new CsvSerializer().serialize(FIELDS, ROWS);
        expect(res.mime).toBe('text/csv');
        expect(res.extension).toBe('csv');
        expect(Buffer.isBuffer(res.content)).toBe(true);

        const text = res.content.toString('utf-8');
        expect(text.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
        const [header] = text.slice(1).split(/\r?\n/);
        expect(header).toBe('project_name,emissions_reduced,verification_url');
    });

    it('ignores keys not in the selected field list', async () => {
        const text = (await new CsvSerializer().serialize(FIELDS, ROWS)).content.toString('utf-8');
        expect(text).not.toContain('secret');
        expect(text).not.toContain('internal_only');
    });

    it('quotes and escapes values containing commas, quotes and newlines', async () => {
        const rows = [{ project_name: 'A, B "C"\nD', emissions_reduced: 1, verification_url: '' }];
        const text = (await new CsvSerializer().serialize(FIELDS, rows)).content.toString('utf-8');
        // comma + embedded double-quotes-doubled + preserved newline, all inside one quoted field
        expect(text).toContain('"A, B ""C""\nD"');
    });

    it('produces a header-only file for an empty row set', async () => {
        const text = (await new CsvSerializer().serialize(FIELDS, [])).content.toString('utf-8');
        const lines = text.slice(1).split(/\r?\n/).filter(Boolean);
        expect(lines).toHaveLength(1);
    });
});

describe('XlsxSerializer', () => {
    it('produces a non-empty .xlsx (ZIP "PK" magic) workbook', async () => {
        const res = await new XlsxSerializer().serialize(FIELDS, ROWS);
        expect(res.extension).toBe('xlsx');
        expect(res.mime).toBeTruthy();
        expect(res.content.length).toBeGreaterThan(0);
        expect(res.content.slice(0, 2).toString('ascii')).toBe('PK'); // OOXML is a zip
    });
});

describe('PdfSerializer', () => {
    it('produces a valid PDF document ("%PDF" magic)', async () => {
        const res = await new PdfSerializer().serialize(FIELDS, ROWS);
        expect(res.extension).toBe('pdf');
        expect(res.content.length).toBeGreaterThan(0);
        expect(res.content.slice(0, 4).toString('ascii')).toBe('%PDF');
    });
});
