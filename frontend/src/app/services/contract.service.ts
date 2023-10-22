import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import {
    ContractType,
    RetireTokenPool,
    RetireTokenRequest,
} from '@guardian/interfaces';

/**
 * Services for working with contracts.
 */
@Injectable()
export class ContractService {
    private readonly url: string = `${API_BASE_URL}/contracts`;

    constructor(private http: HttpClient) {}

    //#region Common contract endpoints
    public getContracts(params: {
        type: ContractType;
        pageIndex?: number;
        pageSize?: number;
    }): Observable<HttpResponse<any[]>> {
        let url = `${this.url}`;
        if (params) {
            url += `?${Object.entries(params)
                .filter(([_, val]) => !!val || typeof val == 'number')
                .map(([name, val]) => `${name}=${val}`)
                .join('&')}`;
        }
        return this.http.get<any>(url, { observe: 'response' });
    }

    public createContract(
        description: string,
        type: ContractType
    ): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.url}`, {
            description,
            type,
        });
    }

    public importContract(
        contractId: string,
        description: string
    ): Observable<HttpResponse<any>> {
        return this.http.post<any>(`${this.url}/import`, {
            contractId,
            description,
        });
    }

    public contractPermissions(contractId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${contractId}/permissions`);
    }

    public removeContract(contractId: string) {
        return this.http.delete<any>(`${this.url}/${contractId}`);
    }

    //#endregion
    //#region Wipe contract endpoints

    public getWipeRequests(params: {
        contractId: string;
        pageIndex?: number;
        pageSize?: number;
    }): Observable<HttpResponse<any[]>> {
        let url = `${this.url}/wipe/requests`;

        if (params) {
            url += `?${Object.entries(params)
                .filter(([_, val]) => !!val || typeof val == 'number')
                .map(([name, val]) => `${name}=${val}`)
                .join('&')}`;
        }
        return this.http.get<any>(url, {
            observe: 'response',
        });
    }

    public enableWipeRequests(contractId: string) {
        return this.http.post<any>(
            `${this.url}/wipe/${contractId}/requests/enable`,
            null
        );
    }

    public disableWipeRequests(contractId: string) {
        return this.http.post<any>(
            `${this.url}/wipe/${contractId}/requests/disable`,
            null
        );
    }

    public approveWipeRequest(requestId: string) {
        return this.http.post<any>(
            `${this.url}/wipe/requests/${requestId}/approve`,
            null
        );
    }

    public rejectWipeRequest(
        requestId: string,
        ban: boolean = false
    ) {
        return this.http.delete<any>(
            `${this.url}/wipe/requests/${requestId}/reject?ban=${ban}`
        );
    }

    public clearWipeRequests(contractId: string) {
        return this.http.delete<any>(`${this.url}/wipe/${contractId}/requests`);
    }

    public wipeAddAdmin(hederaId: string, contractId: string): Observable<any> {
        return this.http.post<any>(
            `${this.url}/wipe/${contractId}/admin/${hederaId}`,
            null
        );
    }

    public wipeRemoveAdmin(
        hederaId: string,
        contractId: string
    ): Observable<HttpResponse<any>> {
        return this.http.delete<any>(
            `${this.url}/wipe/${contractId}/admin/${hederaId}`
        );
    }

    public wipeAddManager(
        hederaId: string,
        contractId: string
    ): Observable<any> {
        return this.http.post<any>(
            `${this.url}/wipe/${contractId}/manager/${hederaId}`,
            null
        );
    }

    public wipeRemoveManager(
        hederaId: string,
        contractId: string
    ): Observable<HttpResponse<any>> {
        return this.http.delete<any>(
            `${this.url}/wipe/${contractId}/manager/${hederaId}`
        );
    }

    public wipeAddWiper(hederaId: string, contractId: string): Observable<any> {
        return this.http.post<any>(
            `${this.url}/wipe/${contractId}/wiper/${hederaId}`,
            null
        );
    }

    public wipeRemoveWiper(
        hederaId: string,
        contractId: string
    ): Observable<any> {
        return this.http.delete<any>(
            `${this.url}/wipe/${contractId}/wiper/${hederaId}`
        );
    }

    //#endregion
    //#region Retire contract endpoints

    public retireSyncPools(contractId: string) {
        return this.http.post<any>(
            `${this.url}/retire/${contractId}/pools/sync`,
            null
        );
    }

    public getRetireRequests(params: {
        contractId?: string;
        pageIndex?: number;
        pageSize?: number;
    }): Observable<HttpResponse<any[]>> {
        let url = `${this.url}/retire/requests`;

        if (params) {
            url += `?${Object.entries(params)
                .filter(([_, val]) => !!val || typeof val == 'number')
                .map(([name, val]) => `${name}=${val}`)
                .join('&')}`;
        }
        return this.http.get<any>(url, {
            observe: 'response',
        });
    }

    public getRetirePools(params: {
        contractId?: string;
        tokens?: string[];
        pageIndex?: number;
        pageSize?: number;
    }): Observable<HttpResponse<any[]>> {
        let url = `${this.url}/retire/pools`;
        if (params) {
            url += `?${Object.entries(params)
                .filter(
                    ([_, val]) =>
                        (!!val && !Array.isArray(val)) ||
                        (!!val && Array.isArray(val) && val.length > 0) ||
                        typeof val == 'number'
                )
                .map(
                    ([name, val]) =>
                        `${name}=${Array.isArray(val) ? val.join(',') : val}`
                )
                .join('&')}`;
        }
        return this.http.get<any>(url, {
            observe: 'response',
        });
    }

    public clearRetireRequests(contractId: string) {
        return this.http.delete<any>(
            `${this.url}/retire/${contractId}/requests`
        );
    }

    public clearRetirePools(contractId: string, tokens?: string[]) {
        let url = `${this.url}/retire/${contractId}/pools`;
        if (Array.isArray(tokens)) {
            url += `?tokens=${tokens}`;
        }
        return this.http.delete<any>(url);
    }

    public setRetirePool(
        contractId: string,
        tokens: {
            tokens: RetireTokenPool[];
            immediately: boolean;
        }
    ) {
        return this.http.post<any>(
            `${this.url}/retire/${contractId}/pools`,
            tokens
        );
    }

    public unsetRetirePool(poolId: string) {
        return this.http.delete<any>(
            `${this.url}/retire/pools/${poolId}`
        );
    }

    public unsetRetireRequest(requestId: string) {
        return this.http.delete<any>(
            `${this.url}/retire/requests/${requestId}`
        );
    }

    public retire(
        poolId: string,
        tokens: RetireTokenRequest[]
    ): Observable<any> {
        return this.http.post<any>(
            `${this.url}/retire/pools/${poolId}/retire`,
            tokens
        );
    }

    public approveRetire(requestId: string): Observable<any> {
        return this.http.post<any>(
            `${this.url}/retire/requests/${requestId}/approve`,
            null
        );
    }

    public cancelRetireRequest(requestId: string): Observable<any> {
        return this.http.delete<any>(
            `${this.url}/retire/requests/${requestId}/cancel`
        );
    }

    public retireAddAdmin(
        hederaId: string,
        contractId: string
    ): Observable<any> {
        return this.http.post<any>(
            `${this.url}/retire/${contractId}/admin/${hederaId}`,
            null
        );
    }

    public retireRemoveAdmin(
        hederaId: string,
        contractId: string
    ): Observable<HttpResponse<any>> {
        return this.http.delete<any>(
            `${this.url}/retire/${contractId}/admin/${hederaId}`
        );
    }

    public getRetireVCs(
        pageIndex?: number,
        pageSize?: number
    ) {
        let url = `${this.url}/retire`;
        if (pageIndex && pageSize) {
            url += `?pageIndex=${pageIndex}&pageSize=${pageSize}`
        }
        return this.http.get<any>(url, {
            observe: 'response',
        });
    }

    //#endregion
}
