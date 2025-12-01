import { IReportTable } from './report-table.interface.js';

/**
 * Multi Compare Result
 */

export interface IMultiCompareResult<T> {
    /**
     * Size
     */
    size: number;
    /**
     * Left Object
     */
    left: T;
    /**
     * Right Objects
     */
    rights: T[];
    /**
     * Total rate
     */
    totals: number[];
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
     * Tool rates (Policy)
     */
    tools?: IReportTable;
    /**
     * InputEvents rates (Module)
     */
    inputEvents?: IReportTable;
    /**
     * OutputEvents rates (Module)
     */
    outputEvents?: IReportTable;
    /**
     * Variables rates (Module)
     */
    variables?: IReportTable;
    /**
     * Field rates (Schema)
     */
    fields?: IReportTable;
    /**
     * Documents rates (Document)
     */
    documents?: IReportTable;
}
