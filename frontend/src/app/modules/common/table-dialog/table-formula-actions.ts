export interface ITableFormulaAction {
    label: string;
    open(event: Event): void;
}

export interface ITableFormulaActions {
    column(key: string): ITableFormulaAction | null;
    cell?(key: string, rowIndex: number, tableIndex?: number): ITableFormulaAction | null;
}
