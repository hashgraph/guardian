import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { PolicyToolMetadata } from '@guardian/interfaces';
import { headersV2 } from '../constants';

/**
 * Services for working from tools.
 */
@Injectable()
export class ToolsService {
    private readonly url: string = `${API_BASE_URL}/tools`;
    constructor(
        private http: HttpClient
    ) { }

    public page(pageIndex: number = 0, pageSize: number = 100, search: string = '', tag: string = ''): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${search}&tag=${tag}`, { observe: 'response', headers: headersV2 });
        }
        return this.http.get<any>(`${this.url}`, { observe: 'response' });
    }

    public getById(id: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${id}`);
    }

    public create(tool: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, tool);
    }

    public pushCreate(tool: any): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<any>(`${this.url}/push`, tool);
    }

    public menuList(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/menu/all`);
    }

    public delete(id: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/${id}`);
    }

    public update(id: string, tool: any): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${id}`, tool);
    }

    public draft(id: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${id}/draft`, null);
    }

    public publish(id: string, options: { toolVersion: string }): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${id}/publish`, options);
    }

    public pushPublish(id: string, options: { toolVersion: string }): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<any>(`${this.url}/${id}/push/publish`, options);
    }

    public dryRun(id: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${id}/dry-run`, null);
    }

    public exportInFile(id: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${id}/export/file`, {
            responseType: 'arraybuffer'
        });
    }

    public exportInMessage(id: string): Observable<any> {
        return this.http.get(`${this.url}/${id}/export/message`);
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

    public importByMessage(
        messageId: string,
        metadata?: PolicyToolMetadata
    ): Observable<any[]> {
        return this.http.post<any[]>(`${this.url}/import/message`, { messageId, metadata });
    }

    public pushImportByMessage(
        messageId: string,
        metadata?: PolicyToolMetadata
    ): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/import/message`, { messageId, metadata });
    }

    public importByFile(
        file: any,
        metadata?: PolicyToolMetadata
    ): Observable<any[]> {
        const formData = new FormData();
        formData.append('file', new Blob([file], { type: "application/octet-stream" }));
        if (metadata) {
            formData.append('metadata', new Blob([JSON.stringify(metadata)], {
                type: "application/json",
            }));
        }
        return this.http.post<any[]>(`${this.url}/import/file-metadata`, formData);
    }

    public pushImportByFile(
        file: any,
        metadata?: PolicyToolMetadata
    ): Observable<{ taskId: string; expectation: number }> {
        const formData = new FormData();
        formData.append(
            'file',
            new Blob([file], { type: 'application/octet-stream' })
        );
        if (metadata) {
            formData.append(
                'metadata',
                new Blob([JSON.stringify(metadata)], {
                    type: 'application/json',
                })
            );
        }
        return this.http.post<{ taskId: string; expectation: number }>(
            `${this.url}/push/import/file-metadata`,
            formData
        );
    }

    public validate(policy: any): Observable<any> {
        return this.http.post<any>(`${this.url}/validate`, policy);
    }

    public checkMessage(messageId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/check/${messageId}`);
    }
}
