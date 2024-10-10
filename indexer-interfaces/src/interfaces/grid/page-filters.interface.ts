/**
 * Page filters
 */
export interface PageFilters {
    /**
     * Page index
     */
    pageIndex?: number | string;
    /**
     * Page size
     */
    pageSize?: number | string;
    /**
     * Order direction
     */
    orderDir?: string;
    /**
     * Order field
     */
    orderField?: string;
    /**
     * Keywords
     */
    keywords?: string;
    /**
     * Other filters
     */
    [field: string]: any;
}
