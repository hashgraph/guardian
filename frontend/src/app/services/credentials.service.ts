import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable()
export class CredentialsService {
    private readonly url: string = `${API_BASE_URL}/credentials`;

    constructor(private http: HttpClient) {
    }

    public getServiceSchemas(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/services`);
    }

    // ==================== User Global ====================

    public getUserGlobalCredentials(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/user/global`);
    }

    public setUserGlobalCredential(body: any): Observable<any> {
        return this.http.put<any>(`${this.url}/user/global`, body);
    }

    public deleteUserGlobalCredential(serviceType: string, dryRun: boolean = false): Observable<any> {
        return this.http.delete<any>(`${this.url}/user/global`, {
            params: { serviceType, dryRun: String(dryRun) }
        });
    }

    // ==================== User Policy ====================

    public getUserPolicyCredentials(policyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/user/policy/${policyId}`);
    }

    public setUserPolicyCredential(policyId: string, body: any): Observable<any> {
        return this.http.put<any>(`${this.url}/user/policy/${policyId}`, body);
    }

    public deleteUserPolicyCredential(policyId: string, serviceType: string, dryRun: boolean = false): Observable<any> {
        return this.http.delete<any>(`${this.url}/user/policy/${policyId}`, {
            params: { serviceType, dryRun: String(dryRun) }
        });
    }

    // ==================== User: view SR credentials (read-only) ====================

    public getSrGlobalCredentialsForUser(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/user/sr-global`);
    }

    public getSrPolicyCredentialsForUser(policyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/user/sr-policy/${policyId}`);
    }

    // ==================== SR Global ====================

    public getSrGlobalCredentials(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/sr/global`);
    }

    public setSrGlobalCredential(body: any): Observable<any> {
        return this.http.put<any>(`${this.url}/sr/global`, body);
    }

    public deleteSrGlobalCredential(serviceType: string, dryRun: boolean = false): Observable<any> {
        return this.http.delete<any>(`${this.url}/sr/global`, {
            params: { serviceType, dryRun: String(dryRun) }
        });
    }

    // ==================== SR Policy ====================

    public getSrPolicyCredentials(policyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/sr/policy/${policyId}`);
    }

    public setSrPolicyCredential(policyId: string, body: any): Observable<any> {
        return this.http.put<any>(`${this.url}/sr/policy/${policyId}`, body);
    }

    public deleteSrPolicyCredential(policyId: string, serviceType: string, dryRun: boolean = false): Observable<any> {
        return this.http.delete<any>(`${this.url}/sr/policy/${policyId}`, {
            params: { serviceType, dryRun: String(dryRun) }
        });
    }
}
