import { Serializer, SerializedExport } from './serializer.interface';

/** Formats one cell value for CSV output, mirroring `frontend/lib/csv-export.ts`'s `escapeCsv()` value-coercion, plus an array-join step so multi-value fields flatten to a `; `-joined string before escaping. */
function cellText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map((v) => cellText(v)).join('; ');
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

/** Quotes/escapes one CSV field with the same rule set as `frontend/lib/csv-export.ts`'s `escapeCsv()`, so CSVs look identical regardless of which code path generated them. */
function escapeCsvField(value: unknown): string {
    const raw = cellText(value);
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n') || raw.includes('\r')) {
        return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
}

function toCsvRow(values: unknown[]): string {
    return values.map(escapeCsvField).join(',');
}

/** UTF-8 byte-order mark, written as an explicit escape so it survives every encoding/editor round-trip; prepended so Excel opens the file with correct encoding instead of guessing Latin-1. */
const UTF8_BOM = '﻿';

/** Hand-rolled CSV serializer (no `csv`/`json2csv` dependency): RFC 4180-style quoting via `escapeCsvField()`, UTF-8 BOM prefix, `\r\n` row terminator, and rows built incrementally then joined once to avoid O(n²) string concatenation. */
export class CsvSerializer implements Serializer {
    async serialize(fields: string[], rows: Record<string, unknown>[]): Promise<SerializedExport> {
        const lines: string[] = [toCsvRow(fields)];
        for (const row of rows) {
            lines.push(toCsvRow(fields.map((field) => row[field])));
        }
        const content = lines.join('\r\n');

        return {
            content: Buffer.from(UTF8_BOM + content, 'utf-8'),
            mime: 'text/csv',
            extension: 'csv',
        };
    }
}
