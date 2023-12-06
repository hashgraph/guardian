import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class RecordService {
    private readonly url: string = `${API_BASE_URL}/record`;

    constructor(private http: HttpClient) {
    }

    public getStatus(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/status`);
    }

    public startRecording(policyId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/recording/start`, null);
    }

    public stopRecording(policyId: string): Observable<ArrayBuffer> {
        return this.http.post(
            `${this.url}/${policyId}/recording/stop`,
            null,
            {
                responseType: 'arraybuffer'
            });
    }

    public getRecordedActions(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/recording/actions`);
    }

    public getRunActions(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/recording/actions`);
    }

    public runRecord(policyId: string, file: any): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/running/start`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public stopRunning(policyId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/running/stop`, null);
    }

    // public exportRecord(policyId: string, recordId?: string): Observable<ArrayBuffer> {
    //     return this.http.get(`${this.url}/${policyId}/record/export/${recordId || 'last'}`, {
    //         responseType: 'arraybuffer'
    //     });
    // }
}
