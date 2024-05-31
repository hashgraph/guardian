import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { API_BASE_URL } from "./api";

/**
 * Service to find VP Documents and Trust Chain.
 */
@Injectable()
export class PermissionsService {
    private readonly url: string = `${API_BASE_URL}/permissions`;

    constructor(private http: HttpClient) {
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

    public permissions(): Observable<any[]> {
        return this.http.get<any>(`${this.url}`);
    }

    public getUsers(
        filters?: any,
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        const params = PermissionsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/users`, { observe: 'response', params });
    }

    public getUser(username: string): Observable<any> {
        return this.http.get<any>(`${this.url}/users/${username}`);
    }

    public updateUser(username: string, roles: string[]): Observable<any> {
        return this.http.put<any>(`${this.url}/users/${username}`, roles);
    }

    public delegateRole(username: string, roles: string[]): Observable<any> {
        return this.http.put<any>(`${this.url}/users/${username}/delegate`, roles);
    }

    public getRoles(
        filters?: any,
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        const params = PermissionsService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/roles`, { observe: 'response', params });
    }

    public createRole(role: any): Observable<any> {
        return this.http.post<any>(`${this.url}/roles`, role);
    }

    public setDefaultRole(id: string): Observable<any> {
        return this.http.post<any>(`${this.url}/roles/default`, { id });
    }

    public deleteRole(id: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/roles/${id}`);
    }

    public updateRole(id: string, role: any): Observable<any> {
        return this.http.put<any>(`${this.url}/roles/${id}`, role);
    }

    public getPolicies(
        username: string,
        pageIndex?: number,
        pageSize?: number,
        status?: string
    ): Observable<HttpResponse<any[]>> {
        const params = PermissionsService.getOptions({ status }, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/users/${username}/policies`, { observe: 'response', params });
    }

    public assignPolicy(username: string, policyIds: string[], assign: boolean) {
        return this.http.post<any>(`${this.url}/users/${username}/policies/assign`, { policyIds, assign });
    }

    public delegatePolicy(username: string, policyIds: string[], assign: boolean) {
        return this.http.post<any>(`${this.url}/users/${username}/policies/delegate`, { policyIds, assign });
    }
}
