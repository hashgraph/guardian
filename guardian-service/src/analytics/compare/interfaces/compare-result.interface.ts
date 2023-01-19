import { IReportTable } from './report-table.interface';

/**
 * Compare Result
 */
export interface ICompareResult<T> {
    /**
     * Left Object
     */
    left: T;
    /**
     * Right Object
     */
    right: T;
    /**
     * Total rate
     */
    total: number;
    /**
     * Block rates (Policy)
     */
    blocks?: IReportTable;
    /**
     * Role rates (Policy)
     */
    roles?: IReportTable;
    /**
     * Group rates (Policy)
     */
    groups?: IReportTable;
    /**
     * Topic rates (Policy)
     */
    topics?: IReportTable;
    /**
     * Token rates (Policy)
     */
    tokens?: IReportTable;
    /**
     * Field rates (Schema)
     */
    fields?: IReportTable;
}