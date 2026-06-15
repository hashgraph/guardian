import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';
import { Page, SearchItem, AdvancedSearchParams, AdvancedSearchResult } from '@indexer/interfaces';

/**
 * Services for working from search.
 */
@Injectable()
export class SearchService {
    private readonly url: string = `${API_BASE_URL}/search`;

    constructor(private http: HttpClient) {}

    public search(
        data: string,
        filters: { pageIndex: number; pageSize: number }
    ): Observable<Page<SearchItem>> {
        const options = ApiUtils.getOptions({ search: data, ...filters });
        return this.http.get<Page<SearchItem>>(this.url, options) as any;
    }

    public advancedSearch(
        params: AdvancedSearchParams
    ): Observable<AdvancedSearchResult> {
        return this.http.post<AdvancedSearchResult>(
            `${this.url}/advanced`,
            params
        );
    }
}
