import { BlockActionError } from '../errors/index.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUtils } from '../helpers/utils.js';

import { DatabaseServer } from '@guardian/common';
import { ITableField } from '@guardian/interfaces';

import { promisify } from 'node:util';
import { gunzip as gunzipRaw } from 'node:zlib';

const gunzipBuffer = promisify(gunzipRaw);

export type TableFileLoader = (fileId: string) => Promise<string>;

/**
 * Parse CSV text into the internal table representation.
 */
export function parseCsvToTable(
    csvText: string,
    delimiter: string = ','
): {
    columnKeys: string[];
    rows: Record<string, string>[];
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
            rows: []
        };
    }

    const headerRow: string[] = parsedRows[0].map((s) => s.trim());

    const dataRows: string[][] = parsedRows
        .slice(1)
        .filter((row) => {
            const hasAnyValue = row.some((value) => value.trim() !== '');
            return row.length > 0 && hasAnyValue;
        });

    const objects: Record<string, string>[] = dataRows.map((row) => {
        const obj: Record<string, string> = {};

        for (let columnIndex = 0; columnIndex < headerRow.length; columnIndex++) {
            const headerKey = headerRow[columnIndex] || String(columnIndex);
            const rawValue = row[columnIndex] ?? '';
            obj[headerKey] = rawValue.trim();
        }

        return obj;
    });

    return {
        columnKeys: headerRow,
        rows: objects
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
 * Loads a text file by its identifier.
 */
export async function loadFileTextById(ref: AnyBlockType, fileId: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    if (!fileId || typeof fileId !== 'string') {
        throw new BlockActionError('Invalid fileId', ref.blockType, ref.uuid);
    }

    try {
        const { buffer } = await DatabaseServer.getGridFile(fileId);

        return  await decodeGridFileText(buffer, encoding);

    } catch (e: any) {
        const message = PolicyUtils?.getErrorMessage ? PolicyUtils.getErrorMessage(e) : String(e?.message ?? e);
        throw new BlockActionError(message, ref.blockType, ref.uuid);
    }
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

function defineHidden<T extends object, K extends string>(
    obj: T,
    key: K,
    value: any
) {
    Object.defineProperty(obj, key, {
        value,
        configurable: true,
        writable: true,
        enumerable: false,
    });
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
 * Recursively traverses any object/array and hydrates all table occurrences.
 */
export async function hydrateTablesInObject(
    root: unknown,
    loadFileText: TableFileLoader,
    delimiter: string = ','
): Promise<() => void> {
    if (root === null || root === undefined) {
        return () => {
            //
        };
    }

    const disposers: (() => void)[] = [];

    const ensureTableHydrated = async (table: ITableField & { fileId: string }) => {
        const hasColumns = !!(table as any).columnKeys;
        const hasRows = !!(table as any).rows;
        if (hasColumns && hasRows) {
            return;
        }

        const csvText = await loadFileText(table.fileId);
        const parsed = parseCsvToTable(csvText, delimiter);

        defineHidden(table, 'columnKeys', parsed.columnKeys);
        defineHidden(table, 'rows', parsed.rows);

        disposers.push(() => {
            delete (table as any).columnKeys;
            delete (table as any).rows;
        });
    };

    const processCandidate = async (
        currentValue: unknown,
        setValue: (v: unknown) => void
    ): Promise<void> => {
        const parsed = parseIfJson(currentValue);

        if (isTableWithFileId(parsed)) {
            const tableObject = parsed as ITableField & { fileId: string };
            const replaced = currentValue !== tableObject;

            if (replaced) {
                setValue(tableObject);
                disposers.push(() => setValue(currentValue));
            }

            await ensureTableHydrated(tableObject);
            await visit(tableObject);
            return;
        }

        await visit(parsed);
    };

    const visit = async (node: unknown): Promise<void> => {
        if (node === null || node === undefined) {
            return;
        }

        if (Array.isArray(node)) {
            const arrayNode = node as unknown[];
            for (let index = 0; index < arrayNode.length; index++) {
                const original = arrayNode[index];
                await processCandidate(original, (v) => { arrayNode[index] = v; });
            }
            return;
        }

        if (!isPlainObject(node)) {
            return;
        }

        const objectNode = node as Record<string, unknown>;
        const keys = Object.keys(objectNode);

        for (const key of keys) {
            const original = objectNode[key];
            await processCandidate(original, (v) => { objectNode[key] = v; });
        }
    };

    await visit(root);

    return () => {
        for (const dispose of disposers) {
            try {
                dispose();
            } catch {
                //
            }
        }
    };
}

/**
 * Recursively collects hydrated table data into the provided map:
 * fileId -> { rows, columnKeys }.
 */
export function collectTablesPack(
    root: unknown,
    tablesPack: Record<string, { rows: any[]; columnKeys: string[] }> = {}
): Record<string, { rows: any[]; columnKeys: string[] }> {
    const visit = (node: unknown): void => {
        if (!node || typeof node !== 'object') {
            return;
        }

        if (Array.isArray(node)) {
            for (const el of node) {
                visit(el)
            }
            return;
        }

        const obj = node as Record<string, unknown>;
        const maybeType = (obj as any)?.type;
        const maybeFileId = (obj as any)?.fileId;

        if (
            maybeType === 'table' &&
            typeof maybeFileId === 'string' &&
            (obj as any)?.rows &&
            (obj as any)?.columnKeys
        ) {
            tablesPack[maybeFileId] = {
                rows: (obj as any).rows,
                columnKeys: (obj as any).columnKeys
            };
        }

        for (const key of Object.keys(obj)) {
            visit((obj as any)[key]);
        }
    };

    visit(root);
    return tablesPack;
}
