export interface IFormulaTarget {
    columnKey?: string;
    rowIndex?: number;
    tableIndex?: number;
}

export function formulaTargetKey(path: string, target?: IFormulaTarget): string {
    return target?.columnKey === undefined ? path : `${path}\u0000${JSON.stringify([target.columnKey, target.rowIndex ?? null, target.rowIndex === undefined ? null : target.tableIndex ?? null])}`;
}

export function parseFormulaTargetKey(key: string): { path: string; target?: IFormulaTarget } {
    const index = key.indexOf('\u0000');
    if (index < 0) {
        return { path: key };
    }
    const [columnKey, rowIndex, tableIndex] = JSON.parse(key.slice(index + 1));
    return { path: key.slice(0, index), target: { columnKey, rowIndex: rowIndex ?? undefined, tableIndex: tableIndex ?? undefined } };
}
