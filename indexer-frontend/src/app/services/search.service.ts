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
    row?: any
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
}

/**
 * Services for working from search.
 */
@Injectable()
export class SearchService {
    private readonly url: string = `${API_BASE_URL}/search`;

    constructor(private http: HttpClient) {
    }

    public search(data: string): Observable<any> {
        const options = ApiUtils.getOptions({ search: data });
        return this.http.get<any>(this.url, options);
    }

    public getVpDocuments(filters: IGridFilters): Observable<IGridResults> {
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/vp-documents`, options) as any;
    }

    public getVpDocument(messageId: string): Observable<IDetailsResults> {
        return this.http.get<any>(`${this.url}/vp-documents/${messageId}`) as any;
    }

    public getVpRelationships(messageId: string): Observable<IRelationshipsResults> {
        return this.http.get<any>(`${this.url}/vp-documents/${messageId}/relationships`) as any;
    }
}