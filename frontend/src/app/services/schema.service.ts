import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema, Schema, SchemaEntity } from 'interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from Schemes.
 */
@Injectable()
export class SchemaService {
    private readonly url: string = `${API_BASE_URL}/schemas`;

    constructor(
        private http: HttpClient
    ) {
    }

    public create(schema: Schema, policyId: any): Observable<ISchema[]> {
        return this.http.post<any[]>(`${this.url}/${policyId}`, schema);
    }

    public update(schema: Schema, id?: string): Observable<ISchema[]> {
        const data = Object.assign({}, schema, { id: id || schema.id });
        return this.http.put<any[]>(`${this.url}`, data);
    }

    public newVersion(schema: Schema, id?: string): Observable<ISchema[]> {
        const data = Object.assign({}, schema, { id: id || schema.id });
        return this.http.post<any[]>(`${this.url}`, data);
    }

    public getSchemes(currentPolicy?: string): Observable<ISchema[]> {
        if (currentPolicy) {
            return this.http.get<ISchema[]>(`${this.url}/${currentPolicy}`);
        }
        return this.http.get<ISchema[]>(`${this.url}`);
    }

    public getSchemesByPage(currentPolicy?: string, pageIndex?: number, pageSize?: number): Observable<HttpResponse<ISchema[]>> {
        let url = `${this.url}`;
        if (currentPolicy) {
            url += `/${currentPolicy}`
        }
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            url += `?pageIndex=${pageIndex}&pageSize=${pageSize}`;
        }
        return this.http.get<any>(url, { observe: 'response' });
    }

    public publish(id: string, version: string): Observable<ISchema[]> {
        return this.http.put<any[]>(`${this.url}/${id}/publish`, { version });
    }

    public unpublished(id: string): Observable<ISchema[]> {
        return this.http.put<any[]>(`${this.url}/${id}/unpublish`, null);
    }

    public delete(id: string): Observable<ISchema[]> {
        return this.http.delete<any[]>(`${this.url}/${id}`);
    }

    public exportInFile(id: string): Observable<Blob> {
        return this.http.get(`${this.url}/${id}/export/file`, {
            responseType: 'blob'
        });
    }

    public exportInMessage(id: string): Observable<ISchema[]> {
        return this.http.get<any[]>(`${this.url}/${id}/export/message`);
    }

    public importByMessage(messageId: string, policyId: any): Observable<ISchema[]> {
        return this.http.post<any[]>(`${this.url}/${policyId}/import/message`, { messageId });
    }

    public importByFile(schemesFile: any, policyId: any): Observable<ISchema[]> {
        return this.http.post<any[]>(`${this.url}/${policyId}/import/file`, schemesFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public previewByMessage(messageId: string): Observable<ISchema> {
        return this.http.post<any>(`${this.url}/import/message/preview`, { messageId });
    }

    public previewByFile(schemesFile: any): Observable<ISchema[]> {
        return this.http.post<any[]>(`${this.url}/import/file/preview`, schemesFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }
}