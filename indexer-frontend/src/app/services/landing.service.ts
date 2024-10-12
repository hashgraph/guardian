import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from './api';
import { LandingAnalytics, ProjectCoordinates } from '@indexer/interfaces';
import { Observable } from 'rxjs';

@Injectable()
export class LandingService {
    private readonly url: string = `${API_BASE_URL}/landing`;

    constructor(private http: HttpClient) {}

    public getAnalytics(): Observable<LandingAnalytics[]> {
        return this.http.get<LandingAnalytics[]>(`${this.url}/analytics`);
    }

    public getProjectsCoordinates(): Observable<ProjectCoordinates[]> {
        return this.http.get<ProjectCoordinates[]>(
            `${this.url}/projects-coordinates`
        );
    }
}
