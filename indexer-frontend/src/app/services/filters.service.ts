import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from filters.
 */
@Injectable()
export class FiltersService {
    private readonly url: string = `${API_BASE_URL}/filters`;

    constructor(private http: HttpClient) {
    }

    public getVpFilters(): Observable<any> {
        return this.http.get<any>(`${this.url}/vp-documents`) as any;
    }

    public getVcFilters(): Observable<any> {
        return this.http.get<any>(`${this.url}/vc-documents`) as any;
    }
}