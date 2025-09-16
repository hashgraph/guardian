import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MigrationConfig, PolicyAvailability, PolicyToolMetadata } from '@guardian/interfaces';
import { Observable, firstValueFrom, of } from 'rxjs';
import { headersV2 } from '../constants';
import { API_BASE_URL } from './api';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class CommentsService {
    private readonly url: string = `${API_BASE_URL}/policy-comments`;

    constructor(private http: HttpClient) {
    }

    public parsePage(response: HttpResponse<any[]>) {
        const page = response.body || [];
        const count = Number(response.headers.get('X-Total-Count')) || page.length;
        return { page, count };
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

    public getUsers(
        policyId: string,
        documentId: string,
    ): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/${policyId}/${documentId}/users`) as any;
    }

    public getChats(
        policyId: string,
        documentId: string,
    ): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/${policyId}/${documentId}/chats`) as any;
    }

    public createChat(
        policyId: string,
        documentId: string,
        data: {
            name?: string | null,
            parent?: string | null,
            field?: string | null,
            fieldName?: string | null,
            relationships?: string[] | null,
            visibility?: string | null,
            roles?: string[] | null,
            users?: string[] | null,
        }
    ): Observable<any[]> {
        return this.http.post<any[]>(`${this.url}/${policyId}/${documentId}/chats`, data) as any;
    }

    public createComment(
        policyId: string,
        documentId: string,
        data: {
            chatId?: string,
            anchor?: string;
            recipients?: string[];
            text?: string;
            files?: any[];
        }
    ) {
        return this.http.post<any>(`${this.url}/${policyId}/${documentId}/comments`, data);
    }

    public getPolicyComments(
        policyId: string,
        documentId: string,
        filters: {
            chatId?: string,
            anchor?: string,
            sender?: string,
            senderRole?: string,
            private?: boolean,
            lt?: string,
            gt?: string
        },
    ): Observable<HttpResponse<any[]>> {
        return this.http.post<any[]>(`${this.url}/${policyId}/${documentId}/comments/search`, filters, { observe: 'response' }) as any;
    }
}
