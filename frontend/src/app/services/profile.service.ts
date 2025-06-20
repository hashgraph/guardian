import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IUser } from '@guardian/interfaces';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api';
import { AuthService } from './auth.service';

/**
 * Services for working from user profile.
 */
@Injectable()
export class ProfileService {
    private readonly url: string = `${API_BASE_URL}/profiles`;
    constructor(
        private http: HttpClient,
        private auth: AuthService,
    ) {
    }

    public static getOptions(
        filters: any,
        pageIndex?: number,
        pageSize?: number
    ): HttpParams {
        let params = new HttpParams();
        if (filters && typeof filters === 'object') {
            for (const key of Object.keys(filters)) {
                if (filters[key]) {
                    params = params.set(key, filters[key]);
                }
            }
        }
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            params = params.set('pageIndex', String(pageIndex));
            params = params.set('pageSize', String(pageSize));
        }
        return params;
    }

    public parsePage(response: HttpResponse<any[]>) {
        const page = response.body || [];
        const count = Number(response.headers.get('X-Total-Count')) || page.length;
        return { page, count };
    }

    public getProfile(): Observable<IUser> {
        return this.http.get<any>(`${this.url}/${encodeURIComponent(this.auth.getUsername())}`);
    }

    public setProfile(profile: IUser): Observable<void> {
        return this.http.put<void>(`${this.url}/${encodeURIComponent(this.auth.getUsername())}`, profile);
    }

    public pushSetProfile(profile: IUser): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${encodeURIComponent(this.auth.getUsername())}`, profile);
    }

    public restoreProfile(profile: IUser): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/restore/${encodeURIComponent(this.auth.getUsername())}`, profile);
    }

    public getAllUserTopics(profile: IUser): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/restore/topics/${encodeURIComponent(this.auth.getUsername())}`, profile);
    }

    public getBalance(): Observable<string | null> {
        return this.http.get<string | null>(`${this.url}/${encodeURIComponent(this.auth.getUsername())}/balance`);
    }

    public validateDID(document: any): Observable<any> {
        return this.http.post<any>(`${this.url}/did-document/validate`, document);
    }

    public validateDIDKeys(document: any, keys: any): Observable<any> {
        return this.http.post<any>(`${this.url}/did-keys/validate`, { document, keys });
    }

    public addStandartRegistriesAsParent(standardRegistryDids: string[]): Observable<any> {
        return this.http.put<any>(`${this.url}/parent/add/${encodeURIComponent(this.auth.getUsername())}`, { did: standardRegistryDids });
    }

    public selectActiveStandartRegistry(standardRegistryDids: string): Observable<any> {
        return this.http.put<any>(`${this.url}/parent/select/${encodeURIComponent(this.auth.getUsername())}`, { did: standardRegistryDids });
    }

    public keys(
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        const filters: any = {};
        const header: any = { observe: 'response' };
        header.params = ProfileService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any[]>(`${this.url}/keys`, header) as any;
    }

    public createKey(option: {
        messageId: string,
        key?: string,
    }): Observable<any> {
        return this.http.post<any>(`${this.url}/keys`, option);
    }
    public deleteKey(id: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/keys/${id}`);
    }
}
