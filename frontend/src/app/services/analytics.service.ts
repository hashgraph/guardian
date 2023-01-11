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

    public compareSchema(
        schemaId1: string,
        schemaId2: string
    ): Observable<any> {
        let params = new HttpParams();
        if (schemaId1 !== undefined) {
            params = params.set('schemaId1', schemaId1);
        }
        if (schemaId2 !== undefined) {
            params = params.set('schemaId2', schemaId2);
        }
        return this.http.get<any>(`${this.url}/compare/schemas`, { params });
    }

    public comparePolicy(
        policyId1: string,
        policyId2: string,
        eventsLvl: string,
        propLvl: string,
        childrenLvl: string,
    ): Observable<any> {
        let params = new HttpParams()
        if (policyId1 !== undefined) {
            params = params.set('policyId1', policyId1);
        }
        if (policyId2 !== undefined) {
            params = params.set('policyId2', policyId2);
        }
        if (eventsLvl !== undefined) {
            params = params.set('eventsLvl', eventsLvl);
        }
        if (propLvl !== undefined) {
            params = params.set('propLvl', propLvl);
        }
        if (childrenLvl !== undefined) {
            params = params.set('childrenLvl', childrenLvl);
        }
        return this.http.get<any>(`${this.url}/compare/policies`, { params });
    }
}
