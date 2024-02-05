import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api';
import { AuthService } from './auth.service';
import { AISearchRequest, AISearchResponse, MOCK_AI_SEARCH_MESSAGE } from '../views/policy-search/policy-ai-search/ai-search.model';
import { delay } from 'rxjs/operators';

/**
 * Services for working with AI Search message.
 */
@Injectable()
export class AISearchService {

    private demoMode: boolean = false;

    private readonly url: string = `${API_BASE_URL}/ai-suggestions/ask`;

    constructor(
        private http: HttpClient,
        private auth: AuthService,
    ) {
    }

    public sendMessage(message: AISearchRequest): Observable<AISearchResponse> {
        if (this.demoMode) {
            return of(MOCK_AI_SEARCH_MESSAGE.filter(o => o.type === 'RESPONSE')[1].data as AISearchResponse).pipe(delay(3000));
        } else {
            return this.http.get<AISearchResponse>(`${this.url}`, {params: {q: message.message}});
        }
    }
}
