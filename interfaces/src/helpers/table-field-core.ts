import { ITableField } from '../interface/table-field.interface.js';

export const TABLE_FORMULA_MAX_ROWS = 10000;

export interface ITableFormulaColumn {
    key: string;
    name: string;
    values: unknown[];
}

export interface ITableFormulaNumbers {
    values: number[];
    replacements: number;
}

type TableFormulaPack = Record<string, {
    rows: any[];
    columnKeys: string[];
}>;

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

function parseTableFormulaValue(value: unknown): ITableField | null {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return isTableValue(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }

    return isTableValue(value) ? value : null;
}

function resolveOneTableFormulaColumn(
    value: unknown,
    columnKey: string,
    tablesPack?: TableFormulaPack
): ITableFormulaColumn | null {
    const table = parseTableFormulaValue(value);
    if (!table || !Array.isArray(table.columnKeys) || !Array.isArray(table.columnNames)) {
        return null;
    }

    const columnIndex = table.columnKeys.indexOf(columnKey);
    if (columnIndex < 0 || typeof table.columnNames[columnIndex] !== 'string') {
        return null;
    }

    return {
        key: columnKey,
        name: table.columnNames[columnIndex],
        values: buildTableHelper(tablesPack).col(table, columnKey)
    };
}

export function resolveTableFormulaColumn(
    value: unknown,
    columnKey: string,
    tablesPack?: TableFormulaPack,
    maxRows: number = TABLE_FORMULA_MAX_ROWS
): ITableFormulaColumn | null {
    const sources = Array.isArray(value) ? value : [value];
    const columns = sources
        .map((source) => resolveOneTableFormulaColumn(source, columnKey, tablesPack))
        .filter((column): column is ITableFormulaColumn => column !== null);

    if (columns.length === 0) {
        return null;
    }

    const result: ITableFormulaColumn = {
        key: columnKey,
        name: columns[0].name,
        values: columns.flatMap((column) => column.values)
    };

    if (result.values.length > maxRows) {
        throw new Error(
            `Table column "${result.name}" has ${result.values.length} rows; `
            + `General formulas are limited to ${maxRows}`
        );
    }

    return result;
}

export function getTableFormulaScalar(value: unknown): number | string {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : String(value);
    }

    if (typeof value !== 'string') {
        return String(value ?? '');
    }

    const trimmed = value.trim();
    const unsigned = trimmed.replace(/^[+-]/, '');
    if (/^0\d/.test(unsigned)) {
        return value;
    }

    if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
        return value;
    }

    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : value;
}

export function getTableFormulaNumbers(values: unknown[]): ITableFormulaNumbers {
    let replacements = 0;
    const numbers = values.map((value) => {
        const scalar = getTableFormulaScalar(value);
        if (typeof scalar === 'number') {
            return scalar;
        }
        replacements += 1;
        return 0;
    });

    return { values: numbers, replacements };
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
            const parsed = Number.parseFloat(normalized);
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
