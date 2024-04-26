import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';
import { IDetailsResults, IGridFilters, IGridResults, IRelationshipsResults } from './types';

/**
 * Services for working from entities.
 */
@Injectable()
export class EntitiesService {
    private readonly url: string = `${API_BASE_URL}/entities`;

    constructor(private http: HttpClient) { }

    // ----------------------------
    // ------------ VP ------------
    // ----------------------------

    public getVpDocuments(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'vp-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getVpDocument(messageId: string): Observable<IDetailsResults> {
        const entity = 'vp-documents';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }

    public getVpRelationships(messageId: string): Observable<IRelationshipsResults> {
        const entity = 'vp-documents';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}/relationships`) as any;
    }

    // ----------------------------
    // ------------ VC ------------
    // ----------------------------

    public getVcDocuments(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'vc-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getVcDocument(messageId: string): Observable<IDetailsResults> {
        const entity = 'vc-documents';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }

    public getVcRelationships(messageId: string): Observable<IRelationshipsResults> {
        const entity = 'vc-documents';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}/relationships`) as any;
    }

}