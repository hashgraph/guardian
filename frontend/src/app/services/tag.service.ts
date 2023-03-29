import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from tags.
 */
@Injectable()
export class TagsService {
    private readonly url: string = `${API_BASE_URL}/tags`;

    constructor(
        private http: HttpClient
    ) { }

    public create(tag: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, tag);
    }

    public search(entity: string, targets: string[]): Observable<any> {
        return this.http.post<any>(`${this.url}/search`, { entity, targets });
    }

    public synchronization(entity: string, target: string): Observable<any> {
        return this.http.post<any>(`${this.url}/synchronization`, { entity, target });
    }

    public delete(uuid: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/${uuid}`);
    }

    public getSchemas(pageIndex?: number, pageSize?: number): Observable<HttpResponse<ISchema[]>> {
        let url = `${this.url}/schemas`;
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            url += `?pageIndex=${pageIndex}&pageSize=${pageSize}`;
        }
        return this.http.get<any>(url, { observe: 'response' });
    }

    public createSchema(schema: ISchema): Observable<ISchema> {
        return this.http.post<any>(`${this.url}/schemas`, schema);
    }

    public deleteSchema(id: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/schemas/${id}`);
    }

    public updateSchema(schema: ISchema, id: string): Observable<ISchema[]> {
        const data = Object.assign({}, schema, { id });
        return this.http.put<any[]>(`${this.url}/schemas/${id}`, data);
    }

    public publishSchema(id: string): Observable<any> {
        return this.http.put<any>(`${this.url}/schemas/${id}/publish`, null);
    }

    public getPublishedSchemas(): Observable<ISchema[]> {
        return this.http.get<ISchema[]>(`${this.url}/schemas/published`);
    }
}