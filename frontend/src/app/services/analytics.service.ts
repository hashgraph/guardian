import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema, Schema, SchemaEntity } from '@guardian/interfaces';
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
}
