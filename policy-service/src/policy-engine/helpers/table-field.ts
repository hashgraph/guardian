import { BlockActionError } from '../errors/index.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUtils } from '../helpers/utils.js';

import { IPFS, Workers } from '@guardian/common';
import { MessageAPI, WorkerTaskType } from '@guardian/interfaces';

export type TableValue = {
    type: 'table';
    columnKeys?: string[];
    rows?: Record<string, string>[];
    fileId?: string;
};

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

/**
 * Narrow utility: true if value is a plain object (not an array).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value)
    );
}

/**
 * Narrow utility: true if value looks like a TableValue.
 */
function isTableValue(value: unknown): value is TableValue {
    return isPlainObject(value) && (value as any).type === 'table';
}

/**
 * Strip leading "ipfs://" and trim whitespace.
 */
function normalizeFileId(id: string): string {
    return (id || '').trim().replace(/^ipfs:\/\//i, '');
}

/**
 * Convert various binary-like values to UTF-8 string.
 */
function toUtf8String(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    // Buffer
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return (value as Buffer).toString('utf-8');
    }

    // Uint8Array
    if (value instanceof Uint8Array) {
        return Buffer.from(value).toString('utf-8');
    }

    // ArrayBuffer
    if (value instanceof ArrayBuffer) {
        return Buffer.from(value as ArrayBuffer as any).toString('utf-8');
    }

    // Best-effort fallback
    try {
        return Buffer.from(value as any).toString('utf-8');
    } catch {
        return String(value ?? '');
    }
}

export async function loadFileTextById(
    ref: AnyBlockType,
    fileId: string
): Promise<string> {
    try {
        if (!fileId || typeof fileId !== 'string') {
            throw new Error('Invalid fileId');
        }

        const normalizedId = normalizeFileId(fileId);
        const isCid = IPFS.CID_PATTERN.test(normalizedId);

        if (isCid) {
            const content = await IPFS.getFile(normalizedId, 'str');
            return toUtf8String(content);
        }

        // Dry-run path — internal id served from DryRunFiles via NATS
        const dryRunResponse = await new Workers().addNonRetryableTask(
            {
                type: WorkerTaskType.GET_FILE,
                data: {
                    target: ['ipfs-client', MessageAPI.GET_FILE_DRY_RUN_STORAGE].join('.'),
                    payload: {
                        cid: normalizedId,
                        responseType: 'str',
                        userId: null
                    }
                }
            },
            {
                priority: 10,
                registerCallback: true
            }
        );

        if (!dryRunResponse) {
            throw new Error('Empty response from dry-run storage');
        }

        return toUtf8String(dryRunResponse);
    } catch (error: any) {
        const message = PolicyUtils?.getErrorMessage
            ? PolicyUtils.getErrorMessage(error)
            : String(error?.message ?? error);
        throw new BlockActionError(message, ref.blockType, ref.uuid);
    }
}

/**
 * Recursively traverse any object/array and "hydrate" all occurrences
 */
export async function hydrateTablesInObject(
    root: unknown,
    loadFileText: TableFileLoader,
    delimiter: string = ','
): Promise<void> {
    if (!root) {
        return;
    }

    const visit = async (node: unknown): Promise<void> => {
        if (!node) {
            return;
        }

        if (Array.isArray(node)) {
            for (const element of node) {
                await visit(element);
            }
            return;
        }

        if (isPlainObject(node)) {
            if (isTableValue(node)) {
                const hasFileId = typeof node.fileId === 'string' && node.fileId.length > 0;
                const rowsMissing = !Array.isArray(node.rows) || node.rows.length === 0;

                if (hasFileId && rowsMissing) {
                    const csvText = await loadFileText(node.fileId);
                    const parsed = parseCsvToTable(csvText, delimiter);

                    node.columnKeys = parsed.columnKeys;
                    node.rows = parsed.rows;

                    return;
                }
            }

            for (const key of Object.keys(node)) {
                await visit(node[key]);
            }
        }
    };

    await visit(root);
}

/**
 * Runtime helper injected into the Expression worker.
 */
export function buildTableHelper() {
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
