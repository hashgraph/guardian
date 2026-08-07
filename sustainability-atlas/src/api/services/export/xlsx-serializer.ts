import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';
import { Serializer, SerializedExport } from './serializer.interface';

/** Formats one cell value for the XLSX sheet — arrays flatten to a readable joined string; everything else passes through as-is (exceljs handles number/boolean/Date cell typing natively). */
function cellValue(value: unknown): unknown {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map((v) => (v === null || v === undefined ? '' : String(v))).join('; ');
    return value;
}

/**
 * `exceljs` XLSX serializer. Uses the streaming `ExcelJS.stream.xlsx.WorkbookWriter` rather than the in-memory
 * `ExcelJS.Workbook` so peak memory stays bounded even for large filtered datasets; the stream target is a
 * `PassThrough` whose chunks are collected into a single `Buffer` here, since `ExportsService`/`StreamableFile`
 * work with one complete in-memory file per generation.
 */
export class XlsxSerializer implements Serializer {
    async serialize(fields: string[], rows: Record<string, unknown>[], datasetTitle: string): Promise<SerializedExport> {
        const passthrough = new PassThrough();
        const chunks: Buffer[] = [];
        const collected = new Promise<void>((resolve, reject) => {
            passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
            passthrough.on('end', () => resolve());
            passthrough.on('error', reject);
        });

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
            stream: passthrough,
            useStyles: true,
            useSharedStrings: false,
        });
        workbook.creator = 'Sustainability Atlas';
        workbook.created = new Date();

        // Worksheet name mirrors the exported dataset (e.g. "Projects", "Issuances") instead of the generic
        // "Export" — Excel worksheet names are capped at 31 chars, which every dataset title comfortably fits.
        const worksheet = workbook.addWorksheet(datasetTitle);

        // `header` is intentionally omitted from the column defs (only `key`/`width` are set): exceljs writes a
        // column's `header` straight into row 1 the moment `.columns` is assigned, which would collide with the
        // title row we write by hand below. `key` alone is enough for the keyed `addRow()` calls further down.
        worksheet.columns = fields.map((field) => ({
            key: field,
            width: Math.min(Math.max(field.length + 2, 14), 40),
        }));

        // Row 1: dataset title, merged across every selected column.
        worksheet.mergeCells(1, 1, 1, Math.max(fields.length, 1));
        const titleCell = worksheet.getCell(1, 1);
        titleCell.value = datasetTitle;
        titleCell.font = { bold: true, size: 14 };
        worksheet.getRow(1).commit();

        // Row 2: column headers (the raw field-catalog keys, same labels as before this change).
        const headerRow = worksheet.getRow(2);
        fields.forEach((field, index) => {
            headerRow.getCell(index + 1).value = field;
        });
        headerRow.font = { bold: true };
        headerRow.commit();

        for (const row of rows) {
            const values: Record<string, unknown> = {};
            for (const field of fields) {
                values[field] = cellValue(row[field]);
            }
            worksheet.addRow(values).commit();
        }
        worksheet.commit();

        // `workbook.commit()` resolves once the stream's writable side has flushed, but we still race it against
        // the readable-side `collected` promise so `Buffer.concat(chunks)` below never reads before every chunk
        // has reached our listener.
        await Promise.all([workbook.commit(), collected]);

        return {
            content: Buffer.concat(chunks),
            mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extension: 'xlsx',
        };
    }
}
