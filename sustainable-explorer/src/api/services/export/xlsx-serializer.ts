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
    async serialize(fields: string[], rows: Record<string, unknown>[]): Promise<SerializedExport> {
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
        workbook.creator = 'Sustainable Explorer';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Export');
        worksheet.columns = fields.map((field) => ({
            header: field,
            key: field,
            width: Math.min(Math.max(field.length + 2, 14), 40),
        }));
        worksheet.getRow(1).font = { bold: true };

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
