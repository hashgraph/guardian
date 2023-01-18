import { IColumn } from 'analytics/table/report-column';
import { ReportTable } from 'analytics/table/report-table';

export interface IReportTable {
    columns: IColumn[];
    report: any[];
}

export interface ICompareResult<T> {
    left: T;
    right: T;
    total: number;
    blocks?: IReportTable;
    roles?: IReportTable;
    groups?: IReportTable;
    topics?: IReportTable;
    tokens?: IReportTable;
    fields?: IReportTable;
}