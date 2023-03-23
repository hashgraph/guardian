import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
}