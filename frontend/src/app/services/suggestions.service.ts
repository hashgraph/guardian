import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { SuggestionsOrderPriority } from '@guardian/interfaces';
/**
 * Services for working from user profile.
 */
@Injectable()
export class SuggestionsService {
    private readonly url: string = `${API_BASE_URL}/suggestions`;
    constructor(private http: HttpClient) {}

    public suggestions(
        data: any
    ): Observable<{ next: string; nested: string }> {
        return this.http.post<any>(`${this.url}/`, data);
    }

    public setSuggestionsConfig(items: SuggestionsOrderPriority[]): Observable<{
        items: SuggestionsOrderPriority[];
    }> {
        return this.http.post<any>(`${this.url}/config`, {
            items,
        });
    }

    public getSuggestionsConfig(): Observable<{
        items: SuggestionsOrderPriority[];
    }> {
        return this.http.get<{
            items: SuggestionsOrderPriority[];
        }>(`${this.url}/config`);
    }
}
