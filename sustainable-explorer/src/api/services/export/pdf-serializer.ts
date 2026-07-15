import pdfMake = require('pdfmake');
import type { Content, TableCell, TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { Serializer, SerializedExport } from './serializer.interface';

/**
 * `pdfmake`'s CJS export is a class instance (`module.exports = new pdfmake()`); `import pdfMake from 'pdfmake'` /
 * `import * as pdfMake from 'pdfmake'` both silently lose the prototype's `setFonts`/`createPdf` methods under
 * `esModuleInterop`/`__importStar`, so `import pdfMake = require('pdfmake')` is the only runtime-safe import.
 */
const PDF_FONT_FAMILY = 'Helvetica';
const PDF_FONTS: TFontDictionary = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
};

function cellText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map((v) => cellText(v)).join(', ');
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

/** "emissions_reduced" -> "Emissions Reduced". */
function humanizeField(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A value cell — URLs become clickable links so verification_url is followable in the PDF. */
function valueCell(value: string): TableCell {
    if (/^https?:\/\//i.test(value)) {
        return { text: value, link: value, style: 'kvLink' };
    }
    return { text: value, style: 'kvValue' };
}

/** `pdfmake` tabular dataset-export serializer. Renders `fields`/`rows` as a single header+body table — the generic "PDF of this filtered dataset" export, distinct from the curated Impact Summary report template (`src/api/services/impact-summary/pdf-template.ts`). */
export class PdfSerializer implements Serializer {
    async serialize(fields: string[], rows: Record<string, unknown>[]): Promise<SerializedExport> {
        const docDefinition = this.buildDocDefinition(fields, rows);
        pdfMake.setFonts(PDF_FONTS);
        const content = await pdfMake.createPdf(docDefinition).getBuffer();

        return {
            content,
            mime: 'application/pdf',
            extension: 'pdf',
        };
    }

    private buildDocDefinition(fields: string[], rows: Record<string, unknown>[]): TDocumentDefinitions {
        // Record-block (key-value) layout instead of a wide table: shows every field readably regardless of how
        // many are selected, since a wide table can't fit on a page and clips the right-hand columns. Empty
        // fields are omitted (e.g. projects have no transaction_id / registry_record_id).
        const records: Content[] =
            rows.length > 0
                ? rows.map((row, idx) => this.recordBlock(fields, row, idx))
                : [{ text: 'No records match the selected filters.', style: 'subtitle' }];

        return {
            pageSize: 'A4',
            pageMargins: [32, 32, 32, 36],
            defaultStyle: { font: PDF_FONT_FAMILY, fontSize: 9 },
            styles: {
                title: { fontSize: 15, bold: true, margin: [0, 0, 0, 2] },
                subtitle: { fontSize: 8, color: '#6b7280', margin: [0, 0, 0, 12] },
                recordIndex: { fontSize: 8, bold: true, color: '#059669', margin: [0, 0, 0, 3] },
                kvLabel: { bold: true, color: '#6b7280', fontSize: 8 },
                kvValue: { fontSize: 9, color: '#111827' },
                kvLink: { fontSize: 9, color: '#2563eb', decoration: 'underline' },
            },
            content: [
                { text: 'Dataset Export', style: 'title' },
                {
                    text: `Generated ${new Date().toISOString()} · ${rows.length} record(s) · ${fields.length} field(s)`,
                    style: 'subtitle',
                },
                ...records,
            ],
        };
    }

    /** One record as a bordered key-value block — one field per row, value column full-width. */
    private recordBlock(fields: string[], row: Record<string, unknown>, index: number): Content {
        const pairs = fields
            .map((f) => ({ label: humanizeField(f), value: cellText(row[f]) }))
            .filter((p) => p.value !== '');

        // One field per row with a full-width value column so long values (DIDs, URLs, names) wrap instead of
        // getting clipped; fixed label width keeps rows aligned.
        const body: TableCell[][] =
            pairs.length > 0
                ? pairs.map((p) => [{ text: p.label, style: 'kvLabel' }, valueCell(p.value)])
                : [[{ text: '(no data)', style: 'kvValue', colSpan: 2 }, {}]];

        return {
            unbreakable: true,
            margin: [0, 0, 0, 10],
            stack: [
                { text: `Record ${index + 1}`, style: 'recordIndex' },
                {
                    table: { widths: [110, '*'], body },
                    layout: {
                        hLineWidth: () => 0.25,
                        vLineWidth: () => 0,
                        hLineColor: () => '#e5e7eb',
                        paddingLeft: () => 4,
                        paddingRight: () => 8,
                        paddingTop: () => 3,
                        paddingBottom: () => 3,
                    },
                },
            ],
        };
    }
}
