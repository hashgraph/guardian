import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MigrationConfig, PolicyAvailability, PolicyToolMetadata } from '@guardian/interfaces';
import { Observable, firstValueFrom, of } from 'rxjs';
import { headersV2 } from '../constants';
import { API_BASE_URL } from './api';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class PolicyRepositoryService {
    private readonly url: string = `${API_BASE_URL}/policy-repository`;

    constructor(private http: HttpClient) {
    }

    public parsePage(response: HttpResponse<any[]>) {
        const page = response.body || [];
        const count = Number(response.headers.get('X-Total-Count')) || page.length;
        return { page, count };
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

    public getUsers(
        policyId: string,
    ): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/${policyId}/users`) as any;
    }

    public getSchemas(
        policyId: string,
    ): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/${policyId}/schemas`) as any;
    }

    public getDocuments(
        policyId: string,
        filters?: {
            type?: 'VC' | 'Vp',
        },
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        const params = PolicyRepositoryService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any[]>(`${this.url}/${policyId}/documents`, { observe: 'response', params }) as any;
    }
}
