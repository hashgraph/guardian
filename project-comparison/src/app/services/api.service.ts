import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import mockComparisonJson from 'mocks/mockComparison.json';
import { API_BASE_URL } from './api';
import { IMethodology, IPolicyCategory } from '../structures';

/**
 * Services for working with contracts.
 */
@Injectable()
export class ApiService {
    private readonly url: string = `${API_BASE_URL}`;

    constructor(private http: HttpClient) {
    }

    public getPolicyCategories(): Observable<IPolicyCategory[]> {
        return this.http.get<IPolicyCategory[]>(`${this.url}/policies/categories`);
    }

    public getProperties(): Observable<any[]> {
        return this.http.get<any>(`${this.url}/projects/properties`);
    }

    public getMethodologies(categoryIds?: string[]): Observable<IMethodology[]> {
        return this.http.post<IMethodology[]>(`${this.url}/policies/filtered-policies`, {categoryIds});
    }

    public getFilteredProjects(categoryIds?: string[], policyIds?: string[]): Observable<IMethodology[]> {
        return this.http.post<IMethodology[]>(`${this.url}/projects/search`, {categoryIds, policyIds});
    }

    public compareProjects(documentIds?: string[]): Observable<any> {
        return this.http.post<any>(`${this.url}/projects/compare/documents`, {documentIds});
    }

    public getComparisonMock(): Observable<any> {
        return of(mockComparisonJson);
    }
}
