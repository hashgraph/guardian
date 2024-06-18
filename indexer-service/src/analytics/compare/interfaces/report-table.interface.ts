import { IColumn } from './report-column.js';

/**
 * Report Table
 */
export interface IReportTable {
    /**
     * Columns
     */
    columns: IColumn[];
    /**
     * Rows
     */
    report: any[];
}
