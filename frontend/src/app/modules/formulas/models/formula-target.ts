export interface IFormulaTarget {
    columnKey?: string;
}

export function formulaTargetKey(path: string, target?: IFormulaTarget): string {
    return target?.columnKey === undefined ? path : `${path}\u0000${JSON.stringify([target.columnKey])}`;
}
