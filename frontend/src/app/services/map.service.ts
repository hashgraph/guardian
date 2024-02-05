import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working with map api.
 */
@Injectable()
export class MapService {
    private readonly url: string = `${API_BASE_URL}/map`;
    private _mapLoaded: boolean = false;

    set mapLoaded(value: boolean) {
        this._mapLoaded = value;
    }

    get mapLoaded() {
        return this._mapLoaded;
    }

    constructor(private http: HttpClient) {}

    public getApiKey(): Observable<any> {
        return this.http.get(`${this.url}/key`, {
            responseType: 'text',
        });
    }

    public getSentinelKey(): Observable<any> {
        return this.http.get(`${this.url}/sh`, {
            responseType: 'text',
        });
    }
}
