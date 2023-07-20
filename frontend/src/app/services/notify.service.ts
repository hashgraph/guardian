import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable()
export class NotificationService {
    private readonly url: string = `${API_BASE_URL}/notifications`;

    constructor(private http: HttpClient) {}

    public all(
        pageIndex?: any,
        pageSize?: any
    ): Observable<HttpResponse<any[]>> {
        const parameters = {
            pageIndex,
            pageSize,
        } as any;
        return this.http.get<any>(`${this.url}`, {
            observe: 'response',
            params: parameters,
        });
    }

    public new(): Observable<any> {
        return this.http.get<any>(`${this.url}/new`);
    }

    public progresses(): Observable<any> {
        return this.http.get<any>(`${this.url}/progresses`);
    }

    public readAll(): Observable<any> {
        return this.http.post<any>(`${this.url}/read/all`, null);
    }

    public delete(notificationId: string) {
        return this.http.delete<number>(`${this.url}/delete/${notificationId}`);
    }
}
