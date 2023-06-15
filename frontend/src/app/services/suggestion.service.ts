import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { SuggestionOrderPriority } from '@guardian/interfaces';
/**
 * Services for working from user profile.
 */
@Injectable()
export class SuggestionService {
    private readonly url: string = `${API_BASE_URL}/suggestion`;
    constructor(
        private http: HttpClient
    ) { }

    public suggestion(
        data: any
    ): Observable<{ next: string, nested: string }> {
        return this.http.post<any>(`${this.url}/`, data);
    }

    public setSuggestionConfig(
        items: SuggestionOrderPriority[]
    ): Observable<SuggestionOrderPriority[]> {
        return this.http.post<any>(`${this.url}/config`, items);
    }

    public getSuggestionConfig(): Observable<SuggestionOrderPriority[]> {
        return this.http.get<SuggestionOrderPriority[]>(
            `${this.url}/config`
        );
    }
}
