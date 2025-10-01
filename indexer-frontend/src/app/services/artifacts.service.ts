import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable({ providedIn: 'root' })
export class ArtifactsService {
    private readonly url = `${API_BASE_URL}/artifacts`;

    constructor(private http: HttpClient) {}

    public getFileText(fileId: string): Observable<HttpResponse<string>> {
        return this.http.get(
            `${this.url}/files/${encodeURIComponent(fileId)}`,
            {
                observe: 'response',
                responseType: 'text'
            }
        ) as Observable<HttpResponse<string>>;
    }

    public getFileBlob(fileId: string): Observable<HttpResponse<Blob>> {
        return this.http.get(
            `${this.url}/files/${encodeURIComponent(fileId)}`,
            {
                observe: 'response',
                responseType: 'blob'
            }
        ) as Observable<HttpResponse<Blob>>;
    }
}
