import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../services/api';

/**
 * Services for working from status.
 */
@Injectable()
export class StatusService {
    private readonly url: string = `${API_BASE_URL}/status`;

    constructor(private http: HttpClient) {
    }

    public getStatuses(): Observable<any> {
        return this.http.get<any>(`${this.url}`);
    }
}