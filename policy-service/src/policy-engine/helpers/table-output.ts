import Papa from 'papaparse';
import { promisify } from 'node:util';
import { gzip as gzipRaw } from 'node:zlib';
import { isPlainObject } from '@guardian/common';

const gzipBuffer = promisify(gzipRaw);

export interface ITableOutputColumn {
    name: string;
    key: string;
}

export interface ITableOutputValue {
    type: 'table';
    rows: unknown[];
}

/**
 * Returns true for the value the math worker writes into a Table output field.
 */
export function isTableOutputValue(value: unknown): value is ITableOutputValue {
    return isPlainObject(value) &&
        value.type === 'table' &&
        Array.isArray(value.rows) &&
        !value.fileId;
}

/**
 * Converts one calculated value into the text of a CSV cell.
 */
export function toTableCell(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return JSON.stringify(value);
}

/**
 * Builds the CSV text of a result table: the declared column names, then one line per row.
 */
export function buildTableOutputCsv(columns: ITableOutputColumn[], rows: unknown[]): string {
    const lines: string[][] = [columns.map((column) => column.name)];
    for (const row of rows) {
        const source = isPlainObject(row) ? row : {};
        lines.push(columns.map((column) => toTableCell(source[column.key])));
    }
    return Papa.unparse(lines);
}

/**
 * Compresses the CSV text the same way the browser stores a Table file.
 */
export async function gzipTableCsv(csv: string): Promise<Buffer> {
    return await gzipBuffer(Buffer.from(csv, 'utf8'));
}

/**
 * Builds the compact Table value the browser writes into a document.
 */
export function buildCompactTableJson(
    fileId: string,
    cid: string | null,
    columns: ITableOutputColumn[]
): string {
    const compact: Record<string, unknown> = { type: 'table', fileId };
    if (cid) {
        compact.cid = cid;
    }
    compact.columnNames = columns.map((column) => column.name);
    compact.columnKeys = columns.map((column) => column.key);
    return JSON.stringify(compact);
}
