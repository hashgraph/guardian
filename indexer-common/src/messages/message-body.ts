/**
 * Message response interface
 */
export interface IPage<T> {
    /**
     * Items
     */
    readonly items: T[];
    /**
     * Page Index
     */
    readonly pageIndex: number;
    /**
     * Page Size
     */
    readonly pageSize: number;
    /**
     * Total
     */
    readonly total: number;
    /**
     * Order
     */
    readonly order?: { [field: string]: string };
}

/**
 * Message response interface
 */
export interface IResults<T> {
    /**
     * Items
     */
    readonly results: T;
}