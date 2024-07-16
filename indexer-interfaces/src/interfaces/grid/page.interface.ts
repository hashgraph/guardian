/**
 * Page response
 */
export interface Page<T> {
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
