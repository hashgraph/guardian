import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from './api';
import { LandingAnalytics, ProjectCoordinates } from '@indexer/interfaces';

@Injectable()
export class LandingService {
    private readonly url: string = `${API_BASE_URL}/landing`;

    constructor(private http: HttpClient) {}

    public getAnalytics() {
        return this.http.get<LandingAnalytics[]>(`${this.url}/analytics`);
    }

    public getProjectsCoordinates() {
        return this.http.get<ProjectCoordinates[]>(
            `${this.url}/projects-coordinates`
        );
    }
}
