import { ITableField } from '@guardian/interfaces';

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
