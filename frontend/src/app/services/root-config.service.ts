import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { IFullConfig } from "interfaces";

/**
 * Services for working from RootAuthority profile.
 */
@Injectable()
export class RootConfigService {
    constructor(
        private http: HttpClient
    ) {
    }

    public createRoot(data: any): Observable<void> {
        return this.http.post<void>('/api/set-root-config', data);
    }

    public getRootConfig(): Observable<IFullConfig | null> {
        return this.http.get<IFullConfig | null>('/api/root-config');
    }

    public getRootBalance(): Observable<string | null> {
        return this.http.get<string | null>('/api/root-balance');
    }
}
