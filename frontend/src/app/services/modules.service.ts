import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from modules.
 */
@Injectable()
export class ModulesService {
    private readonly url: string = `${API_BASE_URL}/modules`;
    constructor(
        private http: HttpClient
    ) { }

    public page(pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
        }
        return this.http.get<any>(`${this.url}`, { observe: 'response' });
    }

    public getById(uuid: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${uuid}`);
    }

    public create(module: any): Observable<any> {
        return this.http.post<any>(`${this.url}/`, module);
    }

    public menuList(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/menu`);
    }

    public delete(uuid: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/${uuid}`);
    }

    public update(uuid: string, module: any): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${uuid}`, module);
    }

    public publish(uuid: string): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${uuid}/publish`, null);
    }

    public pushPublish(uuid: string): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<any>(`${this.url}/${uuid}/push/publish`, null);
    }

    public exportInFile(uuid: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${uuid}/export/file`, {
            responseType: 'arraybuffer'
        });
    }

    public exportInMessage(uuid: string): Observable<any> {
        return this.http.get(`${this.url}/${uuid}/export/message`);
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
}