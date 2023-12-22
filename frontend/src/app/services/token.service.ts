import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IToken, ITokenInfo, IUser } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from Tokens.
 */
@Injectable()
export class TokenService {
    private readonly url: string = `${API_BASE_URL}/tokens`;

    constructor(
        private http: HttpClient
    ) {
    }

    public create(data: any): Observable<IToken[]> {
        return this.http.post<IToken[]>(`${this.url}`, data);
    }

    public pushCreate(data: any): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/`, data);
    }

    public pushUpdate(data: any): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/`, data);
    }

    public pushDelete(tokenId: any): Observable<{ taskId: string, expectation: number }> {
        return this.http.delete<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}`);
    }

    public getTokens(policyId?: string): Observable<ITokenInfo[]> {
        if (policyId) {
            return this.http.get<ITokenInfo[]>(`${this.url}?policy=${policyId}`);
        }
        return this.http.get<ITokenInfo[]>(`${this.url}`);
    }

    public getTokensPage(policyId?: string, pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (policyId) {
            if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
                return this.http.get<ITokenInfo[]>(`${this.url}?policy=${policyId}&pageIndex=${pageIndex}&pageSize=${pageSize}`, {observe: 'response'});
            }
            return this.http.get<ITokenInfo[]>(`${this.url}?policy=${policyId}`, {observe: 'response'});
        }
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<ITokenInfo[]>(`${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}`, {observe: 'response'});
        }
        return this.http.get<ITokenInfo[]>(`${this.url}`, {observe: 'response'});
    }

    public associate(tokenId: string, associate: boolean): Observable<void> {
        if (associate) {
            return this.http.put<void>(`${this.url}/${tokenId}/associate`, null);
        }
        return this.http.put<void>(`${this.url}/${tokenId}/dissociate`, null);
    }

    public pushAssociate(tokenId: string, associate: boolean): Observable<{ taskId: string, expectation: number }> {
        if (associate) {
            return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/associate`, null);
        }
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/dissociate`, null);
    }

    public kyc(tokenId: string, username: string, kyc: boolean): Observable<void> {
        if (kyc) {
            return this.http.put<void>(`${this.url}/${tokenId}/${username}/grant-kyc`, null);
        }
        return this.http.put<void>(`${this.url}/${tokenId}/${username}/revoke-kyc`, null);
    }

    public pushKyc(tokenId: string, username: string, kyc: boolean): Observable<{ taskId: string, expectation: number }> {
        if (kyc) {
            return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/${username}/grant-kyc`, null);
        }
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/${username}/revoke-kyc`, null);
    };

    public freeze(tokenId: string, username: string, freeze: boolean): Observable<void> {
        if (freeze) {
            return this.http.put<void>(`${this.url}/${tokenId}/${username}/freeze`, null);
        }
        return this.http.put<void>(`${this.url}/${tokenId}/${username}/unfreeze`, null);
    }

    public pushFreeze(tokenId: string, username: string, freeze: boolean): Observable<{ taskId: string, expectation: number }> {
        if (freeze) {
            return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/${username}/freeze`, null);
        }
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/${username}/unfreeze`, null);
    };

    public info(tokenId: string, username: string): Observable<ITokenInfo> {
        return this.http.get<ITokenInfo>(`${this.url}/${tokenId}/${username}/info`);
    }
}
