import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from statistics and separate blocks.
 */
@Injectable()
export class FormulasService {
    private readonly url: string = `${API_BASE_URL}/formulas`;

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

    public getFormulas(
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        const params = FormulasService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}`, { observe: 'response', params });
    }

    public createFormula(item: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, item);
    }

    public getFormula(id: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${id}`);
    }

    public getRelationships(id: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${id}/relationships`);
    }

    public deleteFormula(id: any): Observable<any> {
        return this.http.delete<boolean>(`${this.url}/${id}`);
    }

    public updateFormula(item: any): Observable<any> {
        return this.http.put<any>(`${this.url}/${item.id}`, item);
    }

    public export(id: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${id}/export/file`, {
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

    public getFormulasData(options: {
        policyId?: string,
        schemaId?: string,
        documentId?: string,
        parentId?: string,
        fullData?: boolean,
    }): Observable<any> {
        return this.http.post<any>(`${this.url}/data`, options);
    }

    public publish(item: any): Observable<any> {
        return this.http.put<boolean>(`${this.url}/${item.id}/publish`, item);
    }
}
