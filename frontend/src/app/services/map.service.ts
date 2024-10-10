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
    private _mapLoaded: boolean = false;
    private _mapRequested: boolean = false;

    set mapLoaded(value) {
        this._mapLoaded = value;
    }

    get mapLoaded() {
        return this._mapLoaded;
    }

    constructor(private http: HttpClient) {}

    private _mapRequest(value?: string) {
        return this.http.jsonp(
            `https://maps.googleapis.com/maps/api/js${
                value ? '?key=' + value : ''
            }`,
            'callback'
        );
    }

    public getApiKey() {
        return this.http.get(`${this.url}/key`, {
            responseType: 'text',
        });
    }

    public loadMap(): Observable<any> {
        if (this._mapRequested) {
            return of(null);
        }
        this._mapRequested = true;
        return this.getApiKey().pipe(
            switchMap((key) => this._mapRequest(key)),
            tap(() => (this.mapLoaded = true))
        );
    }

    public getSentinelKey(): Observable<any> {
        return this.http.get(`${this.url}/sh`, {
            responseType: 'text',
        });
    }
}
