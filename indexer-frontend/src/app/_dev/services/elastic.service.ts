import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../services/api';

/**
 * Services for working from status.
 */
@Injectable()
export class ElasticService {
    private readonly url: string = `${API_BASE_URL}/elastic`;

    constructor(private http: HttpClient) {
    }

    public update(): Observable<any> {
        return this.http.post<any>(`${this.url}/update`, null);
    }
}