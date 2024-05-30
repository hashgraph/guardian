import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';

export interface IGridFilters {
    pageIndex?: number;
    pageSize?: number;
    orderDir?: string;
    orderField?: string;
    keywords?: string;
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
    id: string,
    uuid?: string;
    item?: any,
    history?: any[],
    row?: any;
    activity?: any;
    schema?: any;
}

export interface IRelationshipsResults {
    id: string,
    item?: any,
    target?: any,
    relationships?: {
        id: string,
        uuid: string,
        type: string,
        topicId: string,
        versions: string[],
    }[],
    links?: {
        source: string,
        target: string,
        type: string
    }[]
    categories?: any
}

/**
 * Services for working from search.
 */
@Injectable()
export class SearchService {
    private readonly url: string = `${API_BASE_URL}/search`;

    constructor(private http: HttpClient) {
    }

    public search(data: string, pageIndex: number): Observable<IGridResults> {
        const options = ApiUtils.getOptions({ search: data, pageIndex });
        return this.http.get<any>(this.url, options) as any;
    }
}
