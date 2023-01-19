import { ReportTable } from './report-table';

/**
 * Row
 */
export class ReportRow {
    /**
     * Parent
     */
    public readonly table: ReportTable;
    /**
     * Values
     */
    public readonly value: any[];

    constructor(table: ReportTable) {
        this.table = table;
        this.value = new Array(table?.columns.length);
    }

    /**
     * Get value by column name
     * @param colName
     * @public
     */
    public get<T>(colName: string): T {
        return this.value[this.table.indexes[colName]];
    }

    /**
     * Set value by column name
     * @param colName
     * @param value
     * @public
     */
    public set<T>(colName: string, value: T): void {
        this.value[this.table.indexes[colName]] = value;
    }

    /**
     * Set value by column name (If value is object)
     * @param colName
     * @param value
     * @public
     */
    public setObject(colName: string, value: any): void {
        if (value && typeof value.toObject === 'function') {
            this.value[this.table.indexes[colName]] = value.toObject();
        } else {
            this.value[this.table.indexes[colName]] = value;
        }
    }

    /**
     * Set value by column name (If value is array)
     * @param colName
     * @param value
     * @public
     */
    public setArray(colName: string, value: any[]): void {
        if (value) {
            this.value[this.table.indexes[colName]] = value.map(v => v.toObject());
        } else {
            this.value[this.table.indexes[colName]] = value;
        }
    }

    /**
     * Get value by index
     * @param index
     * @public
     */
    public getByIndex<T>(index: number): T {
        return this.value[index];
    }

    /**
     * Set value by index
     * @param index
     * @param value
     * @public
     */
    public setByIndex<T>(index: number, value: T): void {
        this.value[index] = value;
    }

    /**
     * Get value (array)
     * @public
     */
    public data(): any[] {
        return this.value;
    }

    /**
     * Get value (map)
     * @public
     */
    public object(): any {
        const result: any = {};
        for (let index = 0; index < this.table.columns.length; index++) {
            result[this.table.columns[index]] = this.value[index];
        }
        return result;
    }
}
