import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from status.
 */
@Injectable()
export class LogsService {
    private readonly url: string = `${API_BASE_URL}/logs`;

    constructor(private http: HttpClient) {
    }

    private getQueryParams(filters: any): HttpParams | null {
        if (typeof filters === 'object') {
            let params: HttpParams = new HttpParams();
            for (const key of Object.keys(filters)) {
                params = params.set(key, filters[key]);
            }
            return params;
        } else {
            return null;
        }
    }

    private getOptions(filters: any): any {
        const params = this.getQueryParams(filters);
        return params ? { params } : {};
    }

    public getMessages(
        filters?: {
            type?: string,
            pageIndex?: number,
            pageSize?: number
        }
    ): Observable<any> {
        const options = this.getOptions(filters);
        return this.http.get<any>(`${this.url}/messages`, options);
    }
}