import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';
import { Page, SearchItem } from '@indexer/interfaces';

/**
 * Services for working from search.
 */
@Injectable()
export class SearchService {
    private readonly url: string = `${API_BASE_URL}/search`;

    constructor(private http: HttpClient) {}

    public search(
        data: string,
        pageIndex: number
    ): Observable<Page<SearchItem>> {
        const options = ApiUtils.getOptions({ search: data, pageIndex });
        return this.http.get<Page<SearchItem>>(this.url, options) as any;
    }
}
