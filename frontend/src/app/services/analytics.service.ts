import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { AuthService } from './auth.service';

/**
 * Analytics Services.
 */
@Injectable()
export class AnalyticsService {
    private readonly url: string = `${API_BASE_URL}/analytics`;

    constructor(
        private http: HttpClient,
        private auth: AuthService
    ) {
    }

    public compareSchema(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/compare/schemas`, options);
    }

    public comparePolicy(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/compare/policies`, options);
    }

    public compareModule(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/compare/modules`, options);
    }

    public compareSchemaFile(options: any, type: string): Observable<any> {
        return this.http.post(`${this.url}/compare/schemas/export?type=${type}`, options, {
            responseType: 'text'
        });
    }

    public comparePolicyFile(options: any, type: string): Observable<any> {
        return this.http.post(`${this.url}/compare/policies/export?type=${type}`, options, {
            responseType: 'text'
        });
    }

    public compareModuleFile(options: any, type: string): Observable<any> {
        return this.http.post(`${this.url}/compare/modules/export?type=${type}`, options, {
            responseType: 'text'
        });
    }

    public searchPolicies(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/search/policies`, options);
    }

    public compareDocuments(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/compare/documents`, options);
    }

    public compareDocumentsFile(options: any, type: string): Observable<any> {
        return this.http.post(`${this.url}/compare/documents/export?type=${type}`, options, {
            responseType: 'text'
        });
    }

    public compareTools(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/compare/tools`, options);
    }

    public compareToolsFile(options: any, type: string): Observable<any> {
        return this.http.post(`${this.url}/compare/tools/export?type=${type}`, options, {
            responseType: 'text'
        });
    }

    public searchBlocks(options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/search/blocks`, options);
    }
}