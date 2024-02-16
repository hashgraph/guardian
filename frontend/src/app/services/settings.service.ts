import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AboutInterface, CommonSettings } from '@guardian/interfaces';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, shareReplay } from 'rxjs/operators';
import { API_BASE_URL } from './api';

/**
 * Services for working from user profile.
 */
@Injectable()
export class SettingsService {
    private readonly url: string = `${API_BASE_URL}/settings`;

    private hederaNetSubject = new BehaviorSubject<string>('');
    private hederaNet = this.hederaNetSubject
        .asObservable()
        .pipe(filter((res) => !!res));

    constructor(private http: HttpClient) {
        this.getRemoteHederaNet().subscribe((res) => {
            this.hederaNetSubject.next(res);
        });
    }

    public updateSettings(settings: CommonSettings): Observable<void> {
        return this.http.post<void>(`${this.url}`, settings);
    }

    public getSettings(): Observable<CommonSettings> {
        return this.http.get<CommonSettings>(`${this.url}`);
    }

    public getHederaNet(): Observable<string> {
        return this.hederaNet;
    }

    private getRemoteHederaNet(): Observable<string> {
        return this.http.get(`${this.url}/environment`, {
            responseType: 'text',
        });
    }

    public getAbout(): Observable<AboutInterface> {
        return this.http.get<AboutInterface>(`${this.url}/about`).pipe(
            shareReplay(1)
        );
    }
}
