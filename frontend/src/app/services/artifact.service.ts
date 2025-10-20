import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { headersV2 } from '../constants';
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
        const parameters: any = {
            pageIndex,
            pageSize
        };
        if (policyId) {
            parameters.policyId = policyId;
        }
        return this.http.get<any>(`${this.url}`, {
            observe: 'response',
            params: parameters,
            headers: headersV2
        });
    }

    public deleteArtifact(artifactId: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/${artifactId}`);
    }

    public upsertFile(
        file: Blob | File,
        fileId?: string
    ): Observable<{ fileId: string; filename: string; contentType: string }> {
        const fd = new FormData();

        const name = (file as File)?.name || 'file.csv';

        fd.append('file', file, name);
        if (fileId) {
            fd.append('fileId', fileId);
        }

        return this.http.post<{ fileId: string; filename: string; contentType: string }>(
            `${this.url}/files`,
            fd
        );
    }

    public getFile(fileId: string): Observable<string> {
        return this.http.get(`${this.url}/files/${encodeURIComponent(fileId)}`, {
            responseType: 'text',
        });
    }

    public getFileBlob(fileId: string): Observable<Blob> {
        return this.http.get(`${this.url}/files/${encodeURIComponent(fileId)}`, {
            responseType: 'blob'
        });
    }

    deleteFile(fileId: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/files/${encodeURIComponent(fileId)}`);
    }
}
