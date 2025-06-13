import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api';
import { switchMap, tap } from 'rxjs/operators';

/**
 * Services for working with map api.
 */
@Injectable()
export class MapService {
    private readonly url: string = `${API_BASE_URL}/map`;

    constructor(private http: HttpClient) {}

    public getSentinelKey(): Observable<any> {
        return this.http.get(`${this.url}/sh`, {
            responseType: 'text',
        });
    }
}
