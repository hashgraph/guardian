import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class RelayerAccountsService {
    private readonly url: string = `${API_BASE_URL}/relayer-accounts`;

    constructor(
        private http: HttpClient,
    ) { }

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

    public getCurrentRelayerAccount(): Observable<any> {
        return this.http.get<any>(`${this.url}/current`);
    }

    public getRelayerAccounts(
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = RelayerAccountsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}`, { observe: 'response', params });
    }

    public getUserRelayerAccounts(
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = RelayerAccountsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/accounts`, { observe: 'response', params });
    }

    public getRelayerAccountBalance(account: string): Observable<string> {
        return this.http.get(`${this.url}/${account}/balance`, { responseType: 'text' });
    }

    public getRelayerAccountsAll(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/all`);
    }

    public createRelayerAccount(
        data: {
            name?: string,
            account?: string,
            key?: string,
            generate?: boolean
        }
    ): Observable<any> {
        return this.http.post<any>(`${this.url}`, data);
    }

    public generateRelayerAccount(): Observable<any> {
        return this.http.post<any>(`${this.url}/generate`, null);
    }

    public getRelationships(
        relayerAccountId: string,
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = RelayerAccountsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/${relayerAccountId}/relationships`, { observe: 'response', params });
    }
}
