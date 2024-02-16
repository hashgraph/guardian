import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
/**
 * Services for working from user profile.
 */
@Injectable()
export class ArtifactService {
    private readonly url: string = `${API_BASE_URL}/artifacts`;
    constructor(
        private http: HttpClient
    ) { }

    public addArtifacts(files: File[], policyId: string): Observable<any> {
        const formData = new FormData();
        for (const file of files) {
            formData.append('artifacts', file);
        }
        return this.http.post<string>(`${this.url}/${policyId}`, formData);
    }

    public getArtifacts(policyId?: string, pageIndex?: any, pageSize?: any): Observable<HttpResponse<any[]>> {
        const parameters = {
            policyId,
            pageIndex,
            pageSize
        } as any;
        return this.http.get<any>(`${this.url}`, {
            observe: 'response',
            params: parameters
        });
    }

    public deleteArtifact(artifactId: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/${artifactId}`);
    }
}
