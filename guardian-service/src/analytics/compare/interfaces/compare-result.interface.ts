import { IColumn } from "analytics/table/report-column";
import { ReportTable } from "analytics/table/report-table";

export interface ICompareResult {
    left: any;
    right: any;
    columns: IColumn[];
    report: ReportTable;
    total: number;
}