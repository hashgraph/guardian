import { Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
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

    public permissions(): Observable<any[]> {
        return this.http.get<any>(`${this.url}`);
    }

    public getUsers(pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}/users?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
        }
        return this.http.get<any>(`${this.url}/users`, { observe: 'response' });
    }

    public updateUser(username: string, user: any): Observable<any> {
        return this.http.put<any>(`${this.url}/users/${username}`, user);
    }

    public getRoles(pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}/roles?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
        }
        return this.http.get<any>(`${this.url}/roles`, { observe: 'response' });
    }

    public createRole(role: any): Observable<any> {
        return this.http.post<any>(`${this.url}/roles`, role);
    }

    public deleteRole(id: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/roles/${id}`);
    }

    public updateRole(id: string, role: any): Observable<any> {
        return this.http.put<any>(`${this.url}/roles/${id}`, role);
    }
}
