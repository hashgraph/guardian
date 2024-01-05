import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { IMethodology, IPolicyCategory } from '../modules/project-comparison/structures';

/**
 * Services for working with contracts.
 */
@Injectable()
export class ProjectComparisonService {
    private readonly url: string = `${API_BASE_URL}`;

    constructor(private http: HttpClient) {
    }

    public getPolicyCategories(): Observable<IPolicyCategory[]> {
        return this.http.get<IPolicyCategory[]>(`${this.url}/policies/methodologies/categories`);
    }

    public getMethodologies(categoryIds?: string[], text?: string): Observable<IMethodology[]> {
        return this.http.post<IMethodology[]>(`${this.url}/policies/methodologies/search`, { categoryIds, text });
    }

    public getProperties(): Observable<any[]> {
        return this.http.get<any>(`${this.url}/projects/properties`);
    }

    public getFilteredProjects(categoryIds?: string[], policyIds?: string[]): Observable<IMethodology[]> {
        return this.http.post<IMethodology[]>(`${this.url}/projects/search`, { categoryIds, policyIds });
    }

    public compareProjects(documentIds?: string[]): Observable<any> {
        return this.http.post<any>(`${this.url}/projects/compare/documents`, { documentIds });
    }
}
