import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DB_NAME, STORES_NAME } from '../constants';
import { API_BASE_URL } from './api';
import { IndexedDbRegistryService } from './indexed-db-registry.service';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class CommentsService {
    private readonly url: string = `${API_BASE_URL}/policy-comments`;

    constructor(
        private http: HttpClient,
        private idb: IndexedDbRegistryService,
    ) {
        this.idb.registerStores(
            DB_NAME.COMMENTS,
            [{ name: STORES_NAME.LAST_READ_COMMENTS, options: { keyPath: 'id' } }]
        );
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

    public getRelationships(
        policyId: string,
        documentId: string,
    ): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/${policyId}/${documentId}/relationships`) as any;
    }

    public getSchemas(
        policyId: string,
        documentId: string,
    ): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/${policyId}/${documentId}/schemas`) as any;
    }

    public getDiscussions(
        policyId: string,
        documentId: string,
        filters?: {
            search?: string,
            field?: string,
            readonly?: boolean
        },
        readonly?: boolean
    ): Observable<any[]> {
        filters = filters || {};
        filters.readonly = readonly;
        const params = CommentsService.getOptions(filters);
        return this.http.get<any[]>(`${this.url}/${policyId}/${documentId}/discussions`, { params }) as any;
    }

    public createDiscussion(
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
    ): Observable<any> {
        return this.http.post<any[]>(`${this.url}/${policyId}/${documentId}/discussions`, data) as any;
    }

    public createComment(
        policyId?: string,
        documentId?: string,
        discussionId?: string,
        data?: {
            anchor?: string;
            recipients?: string[];
            fields?: string[];
            text?: string;
            files?: any[];
        }
    ) {
        return this.http.post<any>(`${this.url}/${policyId}/${documentId}/discussions/${discussionId}/comments`, data);
    }

    public getPolicyComments(
        policyId?: string,
        documentId?: string,
        discussionId?: string,
        filters?: {
            search?: string,
            lt?: string,
            gt?: string
        },
        readonly?: boolean
    ): Observable<HttpResponse<any[]>> {
        return this.http.post<any[]>(
            `${this.url}/${policyId}/${documentId}/discussions/${discussionId}/comments/search`,
            filters,
            {
                observe: 'response',
                params: {
                    readonly: !!readonly
                }
            }
        ) as any;
    }

    public getPolicyCommentsCount(
        policyId?: string,
        documentId?: string,
    ): Observable<any> {
        if (!policyId || !documentId) {
            return of(null);
        }
        return this.http.get<any[]>(`${this.url}/${policyId}/${documentId}/comments/count`) as any;
    }

    public addFile(
        policyId: string,
        documentId: string,
        discussionId: string,
        file: File
    ): Observable<any> {
        return this.http.post<string>(`${this.url}/${policyId}/${documentId}/discussions/${discussionId}/comments/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public getFile(
        policyId: string,
        documentId: string,
        discussionId: string,
        cid: string
    ): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${policyId}/${documentId}/discussions/${discussionId}/comments/file/${cid}`, {
            responseType: 'arraybuffer',
        });
    }

    public downloadKey(
        policyId?: string,
        documentId?: string,
        discussionId?: string
    ): Observable<ArrayBuffer> {
        const params = CommentsService.getOptions({ discussionId });
        return this.http.get(`${this.url}/${policyId}/${documentId}/keys`, {
            params,
            responseType: 'arraybuffer',
        });
    }

    public getLastReads(
        userId: string,
        discussionIds: string[]
    ): Observable<any> {
        return new Observable((subscriber) => {
            this.idb.getBatch(
                DB_NAME.COMMENTS,
                STORES_NAME.LAST_READ_COMMENTS,
                discussionIds.map((discussionId) => `${userId}_${discussionId}`)
            ).then((value) => {
                subscriber.next(value);
            }).catch((error) => {
                subscriber.error(error);
            }).finally(() => {
                subscriber.complete();
            })
        });
    }

    public setLastRead(
        userId: string,
        policyId?: string,
        documentId?: string,
        discussionId?: string,
        count?: number
    ): Observable<any> {
        return new Observable((subscriber) => {
            this.idb.put(
                DB_NAME.COMMENTS,
                STORES_NAME.LAST_READ_COMMENTS,
                {
                    id: `${userId}_${discussionId}`,
                    policyId,
                    documentId,
                    discussionId,
                    count
                }).then((value) => {
                    subscriber.next(value);
                }).catch((error) => {
                    subscriber.error(error);
                }).finally(() => {
                    subscriber.complete();
                })
        });
    }
}
