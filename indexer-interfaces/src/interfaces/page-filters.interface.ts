export interface IPageFilters {
    pageIndex?: number | string;
    pageSize?: number | string;
    orderDir?: string;
    orderField?: string;
    keywords?: string;
    [field: string]: any;
}
