import { IKeyMap } from "analytics/compare/interfaces/key-map.interface";
import { IColumn } from "./report-column";
import { ReportRow } from "./report-row";

export class ReportTable {
    public readonly columns: string[];
    public readonly rows: ReportRow[];
    public readonly indexes: IKeyMap<number> = {};
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

    public createRow(): ReportRow {
        const row = new ReportRow(this);
        this.rows.push(row);
        this.value.push(row.value);
        return row;
    }

    public getByIndex<T>(row: number, col: number): T {
        return this.rows[row].getByIndex<T>(col);
    }

    public setByIndex<T>(row: number, col: number, value: T): void {
        this.rows[row].setByIndex<T>(col, value);
    }

    public data(): any {
        return {
            columns: this.columns,
            rows: this.value
        };
    }

    public object(): any {
        return this.rows.map(row => row.object());
    }
}
