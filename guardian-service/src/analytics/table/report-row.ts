import { ReportTable } from "./report-table";


export class ReportRow {
    public readonly table: ReportTable;
    public readonly value: any[];

    constructor(table: ReportTable) {
        this.table = table;
        this.value = new Array(table?.columns.length);
    }

    public get<T>(colName: string): T {
        return this.value[this.table.indexes[colName]];
    }

    public set<T>(colName: string, value: T): void {
        this.value[this.table.indexes[colName]] = value;
    }

    public setObject(colName: string, value: any): void {
        if (value && typeof value.toObject === 'function') {
            this.value[this.table.indexes[colName]] = value.toObject();
        } else {
            this.value[this.table.indexes[colName]] = value;
        }
    }

    public setArray(colName: string, value: any[]): void {
        if (value) {
            this.value[this.table.indexes[colName]] = value.map(v => v.toObject());
        } else {
            this.value[this.table.indexes[colName]] = value;
        }
    }

    public getByIndex<T>(index: number): T {
        return this.value[index];
    }

    public setByIndex<T>(index: number, value: T): void {
        this.value[index] = value;
    }

    public data(): any[] {
        return this.value;
    }

    public object(): any {
        const result: any = {};
        for (let index = 0; index < this.table.columns.length; index++) {
            result[this.table.columns[index]] = this.value[index];
        }
        return result;
    }
}
