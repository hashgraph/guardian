import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from labels and separate blocks.
 */
@Injectable()
export class PolicyLabelsService {
    private readonly url: string = `${API_BASE_URL}/policy-labels`;

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

    public getLabels(
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = PolicyLabelsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}`, { observe: 'response', params });
    }

    public createLabel(item: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, item);
    }

    public getLabel(labelId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${labelId}`);
    }

    public deleteLabel(labelId: any): Observable<any> {
        return this.http.delete<boolean>(`${this.url}/${labelId}`);
    }

    public updateLabel(item: any): Observable<any> {
        return this.http.put<any>(`${this.url}/${item.id}`, item);
    }

    public publish(item: any): Observable<any> {
        return this.http.put<boolean>(`${this.url}/${item.id}/publish`, item);
    }

    public getRelationships(labelId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${labelId}/relationships`);
    }

    public export(labelId: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${labelId}/export/file`, {
            responseType: 'arraybuffer'
        });
    }

    public import(policyId: string, file: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/${policyId}/import/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public previewByFile(policyFile: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/import/file/preview`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public searchComponents(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/components`, options);
    }

    public getDocuments(
        labelId: string,
        pageIndex?: number,
        pageSize?: number,
    ): Observable<HttpResponse<any[]>> {
        const params = PolicyLabelsService.getOptions({}, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/${labelId}/documents`, { observe: 'response', params });
    }

    public getDocument(
        documentId: string,
        labelId: string,
    ): Observable<any> {
        return this.http.get<any>(`${this.url}/${labelId}/documents/${documentId}`);
    }

    public createAssessment(labelId: string, item: any): Observable<any> {
        return this.http.post<any>(`${this.url}/${labelId}/assessment`, item);
    }
}
