import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema } from '@guardian/interfaces';
import { Observable, Subject } from 'rxjs';
import { API_BASE_URL } from './api';
import { headersV2 } from '../constants';

/**
 * Services for working from tags.
 */
@Injectable()
export class TagsService {
    private readonly url: string = `${API_BASE_URL}/tags`;
    tagsUpdated$: Subject<void> = new Subject<void>();

    constructor(
        private http: HttpClient
    ) { }

    public static getOptions(filters?: {
        pageIndex?: number,
        pageSize?: number,
        [key: string]: any
    }): HttpParams {
        let params = new HttpParams();
        if (filters && typeof filters === 'object') {
            for (const key of Object.keys(filters)) {
                if (filters[key] !== undefined && filters[key] !== null) {
                    if (key !== 'pageIndex' && key !== 'pageSize') {
                        params = params.set(key, filters[key]);
                    }
                }
            }
            if (Number.isInteger(filters.pageIndex) && Number.isInteger(filters.pageSize)) {
                params = params.set('pageIndex', String(filters.pageIndex));
                params = params.set('pageSize', String(filters.pageSize));
            }
        }
        return params;
    }

    public create(tag: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, tag);
    }

    public search(entity: string, targets: string[], linkedItems?: string[]): Observable<any> {
        return this.http.post<any>(`${this.url}/search`, { entity, targets, linkedItems });
    }

    public synchronization(entity: string, target: string): Observable<any> {
        return this.http.post<any>(`${this.url}/synchronization`, { entity, target });
    }

    public delete(uuid: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/${uuid}`);
    }

    public getSchemas(options?: {
        pageIndex?: number,
        pageSize?: number
    }): Observable<HttpResponse<ISchema[]>> {
        const params = TagsService.getOptions(options);
        return this.http.get<any>(`${this.url}/schemas`, { observe: 'response', headers: headersV2, params });
    }

    public createSchema(schema: ISchema): Observable<ISchema> {
        return this.http.post<any>(`${this.url}/schemas`, schema);
    }

    public deleteSchema(id: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/schemas/${id}`);
    }

    public updateSchema(schema: ISchema, id: string): Observable<ISchema[]> {
        const data = Object.assign({}, schema, { id });
        return this.http.put<any[]>(`${this.url}/schemas/${id}`, data);
    }

    public publishSchema(id: string): Observable<any> {
        return this.http.put<any>(`${this.url}/schemas/${id}/publish`, null);
    }

    public getPublishedSchemas(): Observable<ISchema[]> {
        return this.http.get<ISchema[]>(`${this.url}/schemas/published`);
    }
}