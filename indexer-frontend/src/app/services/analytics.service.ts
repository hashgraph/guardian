import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';
import { Page, PageFilters, Policy } from '@indexer/interfaces';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private readonly url = `${API_BASE_URL}/analytics`;

    constructor(private http: HttpClient) {}

    public comparePolicyOriginal(messageId: string, options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/compare/policy/original/${messageId}`, options);
    }

    public getDerivations(messageId: string, filters: PageFilters) {
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Policy>>(`${this.url}/derivations/${messageId}`, options) as any;
    }
}
