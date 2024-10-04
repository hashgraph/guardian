import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from statistics and separate blocks.
 */
@Injectable()
export class PolicyStatisticsService {
    private readonly url: string = `${API_BASE_URL}/policy-statistics`;

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

    public getDefinitions(
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = PolicyStatisticsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}`, { observe: 'response', params });
    }

    public createDefinition(item: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, item);
    }

    public getDefinition(definitionId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${definitionId}`);
    }

    public deleteDefinition(item: any): Observable<any> {
        return this.http.delete<boolean>(`${this.url}/${item.id}`);
    }

    public updateDefinition(item: any): Observable<any> {
        return this.http.put<any>(`${this.url}/${item.id}`, item);
    }

    public publishDefinition(item: any): Observable<any> {
        return this.http.put<boolean>(`${this.url}/${item.id}/publish`, item);
    }

    public createAssessment(definitionId: string, item: any): Observable<any> {
        return this.http.post<any>(`${this.url}/${definitionId}/assessment`, item);
    }

    public getAssessments(
        definitionId: string,
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = PolicyStatisticsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/${definitionId}/assessment`, { observe: 'response', params });
    }

    public getAssessment(definitionId: string, assessmentId: any): Observable<any> {
        return this.http.get<any>(`${this.url}/${definitionId}/assessment/${assessmentId}`);
    }

    public getAssessmentRelationships(definitionId: string, assessmentId: any): Observable<any> {
        return this.http.get<any>(`${this.url}/${definitionId}/assessment/${assessmentId}/relationships`);
    }

    public getRelationships(definitionId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${definitionId}/relationships`);
    }

    public getDocuments(
        definitionId: string,
        pageIndex?: number,
        pageSize?: number,
    ): Observable<HttpResponse<any[]>> {
        const params = PolicyStatisticsService.getOptions({}, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/${definitionId}/documents`, { observe: 'response', params });
    }

}
