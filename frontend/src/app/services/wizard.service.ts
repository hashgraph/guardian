import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { IWizardConfig } from '@guardian/interfaces';

/**
 * Services for working with contracts.
 */
@Injectable()
export class WizardService {
    private readonly url: string = `${API_BASE_URL}/wizard`;

    constructor(private http: HttpClient) {}

    public createPolicyAsync(
        config: any
    ): Observable<{ taskId: string; expectation: number }> {
        return this.http.post<{ taskId: string; expectation: number }>(
            `${this.url}/policy/push`,
            config
        );
    }

    public getPolicyConfig(
        policyId: string,
        config: any
    ): Observable<{ wizardConfig: IWizardConfig; policyConfig: any }> {
        return this.http.post<any>(`${this.url}/${policyId}/config`, config);
    }
}
