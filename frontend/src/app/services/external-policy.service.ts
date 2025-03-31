import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from labels and separate blocks.
 */
@Injectable()
export class ExternalPoliciesService {
    private readonly url: string = `${API_BASE_URL}/external-policies`;

    constructor(private http: HttpClient) {
    }

    public static getOptions(
        filters: any,
        pageIndex?: number,
        pageSize?: number
    ): HttpParams {
        let params = new HttpParams();
        if (filters && typeof filters === 'object') {
            for (const key of Object.keys(filters)) {
                if (filters[key]) {
                    params = params.set(key, filters[key]);
                }
            }
        }
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            params = params.set('pageIndex', String(pageIndex));
            params = params.set('pageSize', String(pageSize));
        }
        return params;
    }


    public parsePage(response: HttpResponse<any[]>) {
        const page = response.body || [];
        const count = Number(response.headers.get('X-Total-Count')) || page.length;
        return { page, count };
    }

    public getPolicies(
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = ExternalPoliciesService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}`, { observe: 'response', params });
    }

    public preview(messageId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/preview`, { messageId });
    }

    public import(messageId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/import`, { messageId });
    }
}
