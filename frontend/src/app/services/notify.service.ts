import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { NotificationAction } from '@guardian/interfaces';
import { Router } from '@angular/router';

@Injectable()
export class NotificationService {
    private readonly url: string = `${API_BASE_URL}/notifications`;

    constructor(private http: HttpClient, private router: Router) {}

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

    viewDetails(notification: any) {
        switch (notification.action) {
            case NotificationAction.POLICIES_PAGE:
                this.router.navigate(['policies']);
                break;
            case NotificationAction.SCHEMAS_PAGE:
                this.router.navigate(['schemas']);
                break;
            case NotificationAction.TOKENS_PAGE:
                this.router.navigate(['tokens']);
                break;
            case NotificationAction.POLICY_CONFIGURATION:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId: notification.result,
                    },
                });
                break;
            case NotificationAction.POLICY_VIEW:
                this.router.navigate(['policy-viewer', notification.result]);
                break;
        }
    }
}
