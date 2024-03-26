import { IColumn } from 'analytics/table/report-column.js';

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
