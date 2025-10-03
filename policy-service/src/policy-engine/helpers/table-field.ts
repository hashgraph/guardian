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

    const visit = async (node: unknown): Promise<void> => {
        const isNodeDefined = node !== null && node !== undefined;
        if (!isNodeDefined) {
            return;
        }

        const isArrayNode = Array.isArray(node);
        if (isArrayNode) {
            for (const element of node as unknown[]) {
                await visit(element);
            }
            return;
        }

        const isObjectNode = isPlainObject(node);
        if (!isObjectNode) {
            return;
        }

        const objectNode = node as Record<string, unknown>;
        const keys = Object.keys(objectNode);

        for (const key of keys) {
            const originalValue = objectNode[key];
            const parsedValue = parseIfJson(originalValue);

            const isTableNeedingHydration = isTableWithFileId(parsedValue);
            if (isTableNeedingHydration) {
                const tableObject = parsedValue as ITableField & { fileId: string };
                const shouldRestoreOriginal = originalValue !== tableObject;

                if (shouldRestoreOriginal) {
                    objectNode[key] = tableObject;
                    disposers.push(() => {
                        objectNode[key] = originalValue;
                    });
                }

                const csvText = await loadFileText(tableObject.fileId);
                const parsedTable = parseCsvToTable(csvText, delimiter);

                defineHidden(tableObject, 'columnKeys', parsedTable.columnKeys);
                defineHidden(tableObject, 'rows', parsedTable.rows);

                disposers.push(() => {
                    delete (tableObject as any).columnKeys;
                    delete (tableObject as any).rows;
                });

                await visit(tableObject);
                continue;
            }

            await visit(originalValue);
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
 * Runtime helper injected into the Expression worker.
 */
export function buildTableHelper(
    tablesPack?: Record<string, { rows: any[]; columnKeys: string[] }>
) {
    type NormalizedTable = {
        type: 'table';
        columnKeys: string[];
        rows: Record<string, string>[];
        fileId?: string;
    };

    const emptyTable = (): NormalizedTable => {
        return {
            type: 'table',
            columnKeys: [],
            rows: []
        };
    };

    const toObject = (value: unknown): unknown => {
        if (value === null) {
            return emptyTable();
        }

        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return emptyTable();
            }
        }

        return value;
    };

    const normalize = (value: unknown): NormalizedTable => {
        const maybeTable = toObject(value);

        if (!isTableValue(maybeTable)) {
            return emptyTable();
        }

        if (tablesPack && typeof maybeTable.fileId === 'string') {
            const packed = tablesPack[maybeTable.fileId];
            if (packed) {
                return {
                    type: 'table',
                    columnKeys: Array.isArray(packed.columnKeys) ? packed.columnKeys : [],
                    rows: Array.isArray(packed.rows) ? packed.rows as any[] : [],
                    fileId: maybeTable.fileId
                };
            }
        }

        const normalized: NormalizedTable = {
            type: 'table',
            columnKeys: Array.isArray(maybeTable.columnKeys) ? maybeTable.columnKeys : [],
            rows: Array.isArray(maybeTable.rows) ? maybeTable.rows : [],
            fileId: typeof maybeTable.fileId === 'string' ? maybeTable.fileId : undefined
        };

        return normalized;
    };

    const getColumnKeys = (value: unknown): string[] => {
        const table = normalize(value);

        if (table.columnKeys.length > 0) {
            return table.columnKeys;
        }

        const firstRow = table.rows[0];

        if (firstRow) {
            return Object.keys(firstRow);
        }

        return [];
    };

    const getRows = (value: unknown): Record<string, string>[] => {
        const table = normalize(value);
        return table.rows;
    };

    const getColumnKeyByIndex = (value: unknown, index: number): string => {
        const keys = getColumnKeys(value);
        const key = keys[index];
        return typeof key === 'string' ? key : '';
    };

    const getCell = (
        value: unknown,
        rowIndex: number,
        keyOrIndex: string | number
    ): unknown => {
        const tableRows = getRows(value);
        const row = tableRows[rowIndex];

        if (!row) {
            return undefined;
        }

        const columnKey = typeof keyOrIndex === 'number'
            ? getColumnKeyByIndex(value, keyOrIndex)
            : keyOrIndex;

        return row?.[columnKey as keyof typeof row];
    };

    /**
     * Convert a value to a number in a tolerant way:
     */
    const toNumber = (value: unknown): number => {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value === 'string') {
            const normalized = value.replace(',', '.');
            const parsed = parseFloat(normalized);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        return 0;
    };

    const getColumnValues = (
        value: unknown,
        keyOrIndex: string | number
    ): unknown[] => {
        const columnKey = typeof keyOrIndex === 'number'
            ? getColumnKeyByIndex(value, keyOrIndex)
            : keyOrIndex;

        return getRows(value).map((row) => row?.[columnKey as keyof typeof row]);
    };

    return {
        normalize,
        keys: getColumnKeys,
        rows: getRows,
        cell: getCell,
        col: getColumnValues,
        num: toNumber
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
