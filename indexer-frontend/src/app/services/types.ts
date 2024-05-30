export interface IGridFilters {
    pageIndex?: number;
    pageSize?: number;
    orderDir?: string;
    orderField?: string;
    [field: string]: any;
}

export interface IGridResults {
    items: any[];
    pageIndex: number;
    pageSize: number;
    total: number;
    order: any;
}

export interface IDetailsResults {
    id: string;
    uuid?: string;
    item?: any;
    history?: any[];
    row?: any;
    [key: string]: any
}

export interface IRelationshipsResults {
    id: string;
    item?: any;
    target?: any;
    relationships?: {
        id: string;
        uuid: string;
        type: string;
        topicId: string;
        versions: string[];
    }[];
    links?: {
        source: string;
        target: string;
        type: string;
    }[];
}
