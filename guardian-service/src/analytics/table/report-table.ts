import { ReportRow } from "./report-row";


export class ReportTable {
    public readonly columns: string[];
    public readonly rows: ReportRow[];
    public readonly indexes: { [col: string]: number; } = {};
    public readonly value: any[][];

    constructor(columns: string[]) {
        if (Array.isArray(columns)) {
            this.columns = columns;
        } else {
            this.columns = [];
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
        return this.rows.map(row=>row.object());
    }
}
