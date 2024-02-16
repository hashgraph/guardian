import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ISession } from '@guardian/interfaces';
import { API_BASE_URL } from './api';

/**
 * Services for working from demo.
 */
@Injectable()
export class DemoService {
    private readonly url: string = `${API_BASE_URL}/demo`;
    constructor(
        private http: HttpClient
    ) {
    }

    public getRandomKey(): Observable<any> {
        return this.http.get<any>(`${this.url}/random-key`);
    }

    public pushGetRandomKey(): Observable<{ taskId: string, expectation: number }> {
        return this.http.get<{ taskId: string, expectation: number }>(`${this.url}/push/random-key`);
    }

    public getAllUsers(): Observable<ISession[]> {
        return this.http.get<any>(`${this.url}/registered-users`);
    }
}
