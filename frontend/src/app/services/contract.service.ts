import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working with contracts.
 */
@Injectable()
export class ContractService {
    private readonly url: string = `${API_BASE_URL}/contracts`;

    constructor(private http: HttpClient) {}

    public all(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/`);
    }

    public page(
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(
                `${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}`,
                { observe: 'response' }
            );
        }
        return this.http.get<any>(`${this.url}`, { observe: 'response' });
    }

    public create(description: string): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.url}`, {
            description,
        });
    }

    public import(parameters: {
        contractId: string;
        description: string;
    }): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.url}/import`, parameters);
    }

    public addUser(
        userId: string,
        contractId: string
    ): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.url}/user`, {
            userId,
            contractId,
        });
    }

    public updateStatus(contractId: string): Observable<any> {
        return this.http.post<any[]>(`${this.url}/status`, {
            contractId,
        });
    }

    public createPair(pairParameters: {
        baseTokenId: string;
        oppositeTokenId: string;
        baseTokenCount: number;
        oppositeTokenCount: number;
    }) {
        return this.http.post<any>(`${this.url}/pair`, pairParameters);
    }

    public getPair(baseTokenId: string, oppositeTokenId: string) {
        return this.http.get<any>(`${this.url}/pair`, {
            params: {
                baseTokenId,
                oppositeTokenId,
            },
        });
    }

    public createRetireRequest(paramters: any) {
        return this.http.post<any>(`${this.url}/retire/request`, paramters);
    }

    public getRetireRequestsAll(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/retire/request`);
    }

    public getRetireRequestsPage(
        contractId?: string,
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(
                contractId
                    ? `${this.url}/retire/request?pageIndex=${pageIndex}&pageSize=${pageSize}&contractId=${contractId}`
                    : `${this.url}/retire/request?pageIndex=${pageIndex}&pageSize=${pageSize}`,
                { observe: 'response' }
            );
        }
        return this.http.get<any>(
            contractId
                ? `${this.url}/retire/request?contractId=${contractId}`
                : `${this.url}/retire/request`,
            { observe: 'response' }
        );
    }

    public cancelContractRequest(requestId: string) {
        return this.http.delete<any>(`${this.url}/retire/request`, {
            params: {
                requestId,
            },
        });
    }

    public retireTokens(requestId: string) {
        return this.http.post<any>(`${this.url}/retire`, {
            requestId,
        });
    }
}