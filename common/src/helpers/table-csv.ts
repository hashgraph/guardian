import { ITableField } from '@guardian/interfaces';

import { promisify } from 'node:util';
import { gunzip as gunzipRaw } from 'node:zlib';

const gunzipBuffer = promisify(gunzipRaw);

/**
 * Rows returned when the caller asks for no particular window.
 */
export const TABLE_EXPAND_DEFAULT_ROWS = 1000;

/**
 * Largest window the server will build, whatever the caller asks for.
 * Roughly 20 MB of row objects and their serialised form at about 200 bytes a row.
 * Set TABLE_EXPAND_MAX_ROWS to override, or to 0 for no ceiling.
 */
export const TABLE_EXPAND_MAX_ROWS =
    Number.isInteger(Number(process.env.TABLE_EXPAND_MAX_ROWS))
        ? Number(process.env.TABLE_EXPAND_MAX_ROWS)
        : 100000;

/**
 * Reason an individual table was returned without its rows.
 */
export type TableExpandSkipReason = 'file-unavailable';

/**
 * Row window and column filter applied to every table in one request.
 */
export interface TableExpandOptions {
    offset?: number;
    limit?: number;
    columns?: string[];
    delimiter?: string;
}

/**
 * Parse CSV text into the internal table representation.
 */
export function parseCsvToTable(
    csvText: string,
    delimiter: string = ',',
    declaredColumnKeys?: string[],
    window?: { offset?: number, limit?: number, columns?: string[] }
): {
    columnKeys: string[];
    rows: Record<string, string>[];
    rowsTotal: number;
} {
    if (csvText && csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
    }

    const parsedRows: string[][] = [];

    let currentCell: string = '';
    let currentRow: string[] = [];
    let insideQuotes: boolean = false;

    const pushCurrentCell = (): void => {
        currentRow.push(currentCell);
        currentCell = '';
    };

    const pushCurrentRow = (): void => {
        parsedRows.push(currentRow);
        currentRow = [];
    };

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];

        if (char === '"') {
            const nextChar = csvText[i + 1];

            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i += 1;
                continue;
            }

            insideQuotes = !insideQuotes;
            continue;
        }

        const isDelimiter = char === delimiter;
        const isLineBreak = char === '\n' || char === '\r';

        if (isDelimiter && !insideQuotes) {
            pushCurrentCell();
            continue;
        }

        if (isLineBreak && !insideQuotes) {
            if (char === '\r' && csvText[i + 1] === '\n') {
                i += 1;
            }
            pushCurrentCell();
            pushCurrentRow();
            continue;
        }

        currentCell += char;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        pushCurrentCell();
        pushCurrentRow();
    }

    if (parsedRows.length === 0) {
        return {
            columnKeys: [],
            rows: [],
            rowsTotal: 0
        };
    }

    const headerRow: string[] = parsedRows[0].map((s) => s.trim());

    const hasDeclaredKeys = Array.isArray(declaredColumnKeys) && declaredColumnKeys.length > 0;
    const columnKeys: string[] = hasDeclaredKeys ? declaredColumnKeys : headerRow;

    const dataRows: string[][] = parsedRows
        .slice(1)
        .filter((row) => {
            const hasAnyValue = row.some((value) => value.trim() !== '');
            return row.length > 0 && hasAnyValue;
        });

    const requestedColumns = window && Array.isArray(window.columns) ? window.columns : [];
    const filterColumns = requestedColumns.length > 0;
    const wantedColumns: string[] = filterColumns
        ? columnKeys.filter((key) => requestedColumns.indexOf(key) !== -1)
        : columnKeys;

    const offset = Math.max(0, Math.trunc(window?.offset ?? 0));
    const requested = Math.trunc(window?.limit ?? dataRows.length);
    const limit = Math.max(0, requested);

    const objects: Record<string, string>[] = [];

    const nothingToReturn = filterColumns && wantedColumns.length === 0;

    for (let rowIndex = offset; !nothingToReturn && rowIndex < dataRows.length; rowIndex++) {
        if (objects.length >= limit) {
            break;
        }

        const row = dataRows[rowIndex];
        const obj: Record<string, string> = {};

        for (let columnIndex = 0; columnIndex < columnKeys.length; columnIndex++) {
            const headerKey = columnKeys[columnIndex] || String(columnIndex);
            if (filterColumns && wantedColumns.indexOf(headerKey) === -1) {
                continue;
            }
            const rawValue = row[columnIndex] ?? '';
            obj[headerKey] = rawValue.trim();
        }

        objects.push(obj);
    }

    return {
        columnKeys: wantedColumns,
        rows: objects,
        rowsTotal: dataRows.length
    };
}

export async function decodeGridFileText(
    fileBuffer: Buffer,
    encoding: BufferEncoding = 'utf8'
): Promise<string> {
    const isGzip =
        fileBuffer.length >= 2 &&
        fileBuffer[0] === 0x1f &&
        fileBuffer[1] === 0x8b;

    if (isGzip) {
        const uncompressed = await gunzipBuffer(fileBuffer);
        return uncompressed.toString(encoding);
    }

    return fileBuffer.toString(encoding);
}

/**
 * Returns true if the value is a plain object (i.e., created via object literal or Object).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
    const isDefined = value !== null && value !== undefined;
    if (!isDefined) {
        return false;
    }

    const isObjectType = typeof value === 'object';
    if (!isObjectType) {
        return false;
    }

    return (value as object).constructor === Object;
}

/**
 * Returns true if the value is a TableValue-like object (has type === "table").
 */
export function isTableValue(value: unknown): value is ITableField {
    const isPlain = isPlainObject(value);
    if (!isPlain) {
        return false;
    }

    return (value as any).type === 'table';
}

/**
 * Returns true if the value is a TableValue-like object with a non-empty string fileId.
 */
export function isTableWithFileId(value: unknown): value is ITableField & { fileId: string } {
    const isTableLike = isTableValue(value);
    if (!isTableLike) {
        return false;
    }

    const fileIdValue = (value as any).fileId;
    const isStringFileId = typeof fileIdValue === 'string';
    if (!isStringFileId) {
        return false;
    }

    return  fileIdValue.trim().length > 0;
}

/**
 * If the input is a JSON-string (object or array), returns the parsed value; otherwise returns the original input.
 */
export function parseIfJson(input: unknown): unknown {
    const isString = typeof input === 'string';
    if (!isString) {
        return input;
    }

    const trimmed = (input as string).trim();
    const isNonEmpty = trimmed.length > 0;
    if (!isNonEmpty) {
        return input;
    }

    const startsWithObject = trimmed.startsWith('{');
    const startsWithArray = trimmed.startsWith('[');
    const looksLikeJson = startsWithObject || startsWithArray;
    if (!looksLikeJson) {
        return input;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return input;
    }
}

/**
 * Returns true if the table value carries the declared column marker written by the schema editor.
 */
export function hasDeclaredTableColumns(table: ITableField): boolean {
    const names = table.columnNames;
    const keys = table.columnKeys;

    return Array.isArray(names) && names.length > 0 && Array.isArray(keys) && keys.length > 0;
}

/**
 * Loads the raw bytes of one table file.
 */
export type TableFileBufferLoader = (fileId: string) => Promise<Buffer>;

/**
 * Recursively replaces every table pointer in a copy of the input with the same value plus its rows.
 * The input is never modified, and a branch containing no table is returned as the very same value,
 * so a field that merely holds a JSON string keeps that string.
 */
export async function expandTablesInDocument(
    root: unknown,
    loadFileBuffer: TableFileBufferLoader,
    options: TableExpandOptions = {}
): Promise<unknown> {
    const offset = Math.max(0, Math.trunc(options.offset ?? 0));
    const requestedLimit = Math.trunc(options.limit ?? TABLE_EXPAND_DEFAULT_ROWS);
    const limit = TABLE_EXPAND_MAX_ROWS > 0
        ? Math.min(Math.max(0, requestedLimit), TABLE_EXPAND_MAX_ROWS)
        : Math.max(0, requestedLimit);
    const delimiter = options.delimiter ?? ',';

    const expandTable = async (
        table: ITableField & { fileId: string }
    ): Promise<Record<string, unknown>> => {
        let buffer: Buffer;
        try {
            buffer = await loadFileBuffer(table.fileId);
        } catch {
            return { ...table, expanded: false, expandSkipped: 'file-unavailable' };
        }

        if (!buffer) {
            return { ...table, expanded: false, expandSkipped: 'file-unavailable' };
        }

        const csvText = await decodeGridFileText(buffer);
        const declaredColumnKeys = hasDeclaredTableColumns(table) ? table.columnKeys : undefined;
        const parsed = parseCsvToTable(csvText, delimiter, declaredColumnKeys, {
            offset,
            limit,
            columns: options.columns
        });

        return {
            ...table,
            columnKeys: parsed.columnKeys,
            rows: parsed.rows,
            rowsTotal: parsed.rowsTotal,
            rowsOffset: offset,
            rowsRequested: limit,
            rowsTruncated: offset + parsed.rows.length < parsed.rowsTotal,
            expanded: true
        };
    };

    const visit = async (node: unknown): Promise<{ value: unknown, changed: boolean }> => {
        const parsed = parseIfJson(node);

        if (isTableWithFileId(parsed)) {
            const expanded = await expandTable(parsed as ITableField & { fileId: string });
            return { value: expanded, changed: true };
        }

        if (Array.isArray(parsed)) {
            const items: unknown[] = [];
            let changed = false;
            for (const item of parsed) {
                const visited = await visit(item);
                items.push(visited.value);
                changed = changed || visited.changed;
            }
            return changed ? { value: items, changed: true } : { value: node, changed: false };
        }

        if (isPlainObject(parsed)) {
            const source = parsed as Record<string, unknown>;
            const result: Record<string, unknown> = {};
            let changed = false;
            for (const key of Object.keys(source)) {
                const visited = await visit(source[key]);
                result[key] = visited.value;
                changed = changed || visited.changed;
            }
            return changed ? { value: result, changed: true } : { value: node, changed: false };
        }

        return { value: node, changed: false };
    };

    return (await visit(root)).value;
}
