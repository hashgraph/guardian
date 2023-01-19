/**
 * Map Rate by keys
 */
export interface IRateMap<T> {
    /**
     * Key
     */
    key?: string;
    /**
     * Left object
     */
    left: T;
    /**
     * Right object
     */
    right: T;
}