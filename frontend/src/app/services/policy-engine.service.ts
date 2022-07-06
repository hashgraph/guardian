import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, Subject, Subscription } from 'rxjs';
import { webSocket, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';
import { API_BASE_URL } from './api';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class PolicyEngineService {
    private readonly url: string = `${API_BASE_URL}/policies`;

    constructor(private http: HttpClient) {
    }

    public all(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/`);
    }

    public page(pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
        }
        return this.http.get<any>(`${this.url}`, { observe: 'response' });
    }

    public create(policy: any): Observable<void> {
        return this.http.post<any>(`${this.url}/`, policy);
    }

    public policy(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}`);
    }

    public update(policyId: string, policy: any): Observable<void> {
        return this.http.put<any>(`${this.url}/${policyId}`, policy);
    }

    public publish(policyId: string, policyVersion: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${policyId}/publish`, { policyVersion });
    }

    public validate(policy: any): Observable<any> {
        return this.http.post<any>(`${this.url}/validate`, policy);
    }

    public policyBlock(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks`);
    }

    public getBlockData(blockId: string, policyId: string, filters?: any): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks/${blockId}`, {
            params: filters
        });
    }

    public setBlockData(blockId: string, policyId: string, data: any): Observable<any> {
        return this.http.post<void>(`${this.url}/${policyId}/blocks/${blockId}`, data);
    }

    public getGetIdByName(blockName: string, policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/tag/${blockName}`);
    }

    public getParents(blockId: string, policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks/${blockId}/parents`);
    }

    public exportInFile(policyId: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${policyId}/export/file`, {
            responseType: 'arraybuffer'
        });
    }

    public exportInMessage(policyId: string): Observable<any> {
        return this.http.get(`${this.url}/${policyId}/export/message`);
    }

    public importByMessage(messageId: string, versionOfTopicId?: string): Observable<any[]> {
        var query = versionOfTopicId ? `?versionOfTopicId=${versionOfTopicId}` : '';
        return this.http.post<any[]>(`${this.url}/import/message${query}`, { messageId });
    }

    public importByFile(policyFile: any, versionOfTopicId?: string): Observable<any[]> {
        var query = versionOfTopicId ? `?versionOfTopicId=${versionOfTopicId}` : '';
        return this.http.post<any[]>(`${this.url}/import/file${query}`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public previewByMessage(messageId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/import/message/preview`, { messageId });
    }

    public previewByFile(policyFile: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/import/file/preview`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public blockAbout(): Observable<any> {
        return this.http.get<any>(`${this.url}/blocks/about`);
    }

    private getBaseUrl() {
        let url = location.origin;
        if (/^https/.test(url)) {
            return `${url.replace(/^https/, 'wss')}`;
        }
        return `${url.replace(/^http/, 'ws')}`;
    }

    private getUrl(accessToken: string | null) {
        return `${this.getBaseUrl()}/ws/?token=${accessToken}`;
    }
}
