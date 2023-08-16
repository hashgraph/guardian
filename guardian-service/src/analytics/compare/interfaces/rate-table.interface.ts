/**
 * Rate Table
 */

export interface IRateTable<T> {
    /**
     * Type
     */
    type: string;
    /**
     * Rate
     */
    totalRate: number;
    /**
     * Items
     */
    items: T[];
    /**
     * Other
     */
    [x: string]: any
}
