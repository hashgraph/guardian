import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IToken, ITokenInfo, IUser } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { headersV2 } from '../constants';

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

    public getTokensPage(
        policyId?: string,
        pageIndex?: number,
        pageSize?: number,
        status?: string,
    ): Observable<HttpResponse<any[]>> {
        const params = TokenService.getOptions({ policyId, status }, pageIndex, pageSize);
        return this.http.get<ITokenInfo[]>(`${this.url}`, { observe: 'response', params, headers: headersV2 });
    }

    public getTokenById(tokenId: string, policyId?: string): Observable<HttpResponse<ITokenInfo>> {
        const url: string = `${this.url}/${tokenId}`
        const params: HttpParams = TokenService.getOptions({ policyId });
        return this.http.get<ITokenInfo>(`${url}`, { observe: 'response', params });
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

    public pushAssociateWithAccount(
        tokenId: string,
        accountId: string,
        associate: boolean
    ): Observable<{ taskId: string, expectation: number }> {
        if (associate) {
            return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/associate/${accountId}`, null);
        } else {
            return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${tokenId}/dissociate/${accountId}`, null);
        }
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

    public relayerAccountInfo(tokenId: string, relayerAccount: string): Observable<ITokenInfo> {
        return this.http.get<ITokenInfo>(`${this.url}/${tokenId}/relayer-accounts/${relayerAccount}/info`);
    }

    public serials(tokenId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${tokenId}/serials`);
    }

    public menuList(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/menu/all`);
    }
}
