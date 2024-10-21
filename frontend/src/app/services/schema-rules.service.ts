import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from statistics and separate blocks.
 */
@Injectable()
export class SchemaRulesService {
    private readonly url: string = `${API_BASE_URL}/schema-rules`;

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

    public getRules(
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = SchemaRulesService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}`, { observe: 'response', params });
    }

    public createRules(item: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, item);
    }

    public getRule(ruleId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${ruleId}`);
    }

    public deleteRule(ruleId: any): Observable<any> {
        return this.http.delete<boolean>(`${this.url}/${ruleId}`);
    }

    public updateRule(item: any): Observable<any> {
        return this.http.put<any>(`${this.url}/${item.id}`, item);
    }

    public activateRule(item: any, activate: boolean): Observable<any> {
        if (activate) {
            return this.http.put<boolean>(`${this.url}/${item.id}/activate`, item);
        } else {
            return this.http.put<boolean>(`${this.url}/${item.id}/inactivate`, item);
        }
    }

    public getRelationships(ruleId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${ruleId}/relationships`);
    }

    public getSchemaRuleData(options: {
        policyId?: string,
        schemaId?: string,
        documentId?: string,
        parentId?: string,
    }): Observable<any> {
        return this.http.post<any>(`${this.url}/data`, options);
    }
}
