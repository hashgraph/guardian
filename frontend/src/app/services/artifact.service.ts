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

    public addArtifacts(
        files: File[],
        currentId: string
    ): Observable<any> {
        const formData = new FormData();
        for (const file of files) {
            formData.append('artifacts', file);
        }
        return this.http.post<string>(`${this.url}/${currentId}`, formData);
    }

    public getArtifacts(
        currentId?: string,
        type?: string,
        pageIndex?: any,
        pageSize?: any
    ): Observable<HttpResponse<any[]>> {
        const parameters: any = {
            pageIndex,
            pageSize,
            type
        };
        if (currentId) {
            if (type === 'tool') {
                parameters.toolId = currentId;
            } else if (type === 'policy') {
                parameters.policyId = currentId;
            } else {
                parameters.id = currentId;
            }
        }
        return this.http.get<any>(`${this.url}`, {
            observe: 'response',
            params: parameters
        });
    }

    public deleteArtifact(artifactId: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/${artifactId}`);
    }
}
