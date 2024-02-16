import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ISchema } from '@guardian/interfaces';

/**
 * Services for working from tools.
 */
@Injectable()
export class ToolsService {
    private readonly url: string = `${API_BASE_URL}/tools`;
    constructor(
        private http: HttpClient
    ) { }

    public page(pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
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

    public publish(id: string): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${id}/publish`, null);
    }

    public pushPublish(id: string): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<any>(`${this.url}/${id}/push/publish`, null);
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

    public importByMessage(messageId: string): Observable<any[]> {
        return this.http.post<any[]>(`${this.url}/import/message`, { messageId });
    }

    public importByFile(file: any): Observable<any[]> {
        return this.http.post<any[]>(`${this.url}/import/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public pushImportByMessage(messageId: string): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/import/message`, { messageId });
    }

    public pushImportByFile(file: any): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/import/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public validate(policy: any): Observable<any> {
        return this.http.post<any>(`${this.url}/validate`, policy);
    }
}
