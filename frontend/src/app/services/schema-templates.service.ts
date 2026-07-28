import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchemaTemplate } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

interface TaskResponse {
    taskId: string;
    expectation: number;
}

export interface SchemaTemplateGridItem extends ISchemaTemplate {
    schemasCount?: number;
}

@Injectable()
export class SchemaTemplatesService {
    private readonly url: string = `${API_BASE_URL}/schema-templates`;

    constructor(private readonly http: HttpClient) {
    }

    public page(
        pageIndex: number = 0,
        pageSize: number = 20,
        search?: string
    ): Observable<HttpResponse<SchemaTemplateGridItem[]>> {
        const params = new HttpParams()
            .set('pageIndex', String(pageIndex))
            .set('pageSize', String(pageSize))
            .set('search', search || '');
        return this.http.get<SchemaTemplateGridItem[]>(this.url, {
            observe: 'response',
            params
        });
    }

    public getById(id: string): Observable<SchemaTemplateGridItem> {
        return this.http.get<SchemaTemplateGridItem>(`${this.url}/${id}`);
    }

    public create(template: Partial<ISchemaTemplate>): Observable<SchemaTemplateGridItem> {
        return this.http.post<SchemaTemplateGridItem>(`${this.url}/`, template);
    }

    public pushCreate(template: Partial<ISchemaTemplate>): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/push`, template);
    }

    public update(id: string, template: Partial<ISchemaTemplate>): Observable<SchemaTemplateGridItem> {
        return this.http.put<SchemaTemplateGridItem>(`${this.url}/${id}`, template);
    }

    public delete(id: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/${id}`);
    }

    public pushDelete(id: string): Observable<TaskResponse> {
        return this.http.delete<TaskResponse>(`${this.url}/push/${id}`);
    }
}
