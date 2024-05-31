import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable()
export class LandingService {
    private readonly url: string = `${API_BASE_URL}/landing`;

    constructor(private http: HttpClient) {
    }

    public getAnalytics(): Observable<any> {
        return this.http.get<any>(`${this.url}/analytics`) as any;
    }

    public getProjectsCoordinates(): Observable<any> {
        return this.http.get<any>(`${this.url}/projects-coordinates`) as any;
    }
}
