import { IKeyMap } from 'analytics/compare/interfaces/key-map.interface';
import { IColumn } from './report-column';
import { ReportRow } from './report-row';

/**
 * Table
 */
export class ReportTable {
    /**
     * Columns
     */
    public readonly columns: string[];
    /**
     * Rows
     */
    public readonly rows: ReportRow[];
    /**
     * Get index by column name
     */
    public readonly indexes: IKeyMap<number> = {};
    /**
     * Values
     */
    public readonly value: any[][];

    constructor(columns: string[] | IColumn[]) {
        this.columns = [];
        if (Array.isArray(columns)) {
            for (const col of columns) {
                if (typeof col === 'string') {
                    this.columns.push(col);
                } else {
                    this.columns.push(col.name);
                }
            }
        }
        this.rows = [];
        for (let index = 0; index < this.columns.length; index++) {
            this.indexes[this.columns[index]] = index;
        }
        this.value = [];
    }

    /**
     * Create new row
     * @public
     */
    public createRow(): ReportRow {
        const row = new ReportRow(this);
        this.rows.push(row);
        this.value.push(row.value);
        return row;
    }

    /**
     * Get value by indexes
     * @param row - row index
     * @param col - column index
     * @public
     */
    public getByIndex<T>(row: number, col: number): T {
        return this.rows[row].getByIndex<T>(col);
    }

    /**
     * Set value by indexes
     * @param row - row index
     * @param col - column index
     * @public
     */
    public setByIndex<T>(row: number, col: number, value: T): void {
        this.rows[row].setByIndex<T>(col, value);
    }

    /**
     * Get structure
     * @public
     */
    public data(): any {
        return {
            columns: this.columns,
            rows: this.value
        };
    }

    /**
     * Get rows (structure)
     * @public
     */
    public object(): any[] {
        return this.rows.map(row => row.object());
    }
}
