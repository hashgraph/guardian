import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api';
/**
 * Services for working from user profile.
 */
@Injectable()
export class IPFSService {
    private readonly url: string = `${API_BASE_URL}/ipfs`;
    private readonly cidPattern: RegExp =
        /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/;
    constructor(private http: HttpClient) {}

    public addFile(file: any): Observable<any> {
        return this.http.post<string>(`${this.url}/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public getFile(cid: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/file/${cid}`, {
            responseType: 'arraybuffer',
        });
    }

    public getJsonFile(cid: string): Observable<any> {
        return this.http.get<any>(`${this.url}/file/${cid}`);
    }

    public getImageByLink(link: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let cidMatches = link.match(this.cidPattern);
            this.getFile((cidMatches && cidMatches[0]) || '').subscribe(
                (res) => {
                    resolve(
                        `data:image/jpg;base64,${btoa(
                            Array.from(new Uint8Array(res))
                                .map((b) => String.fromCharCode(b))
                                .join('')
                        )}`
                    );
                },
                reject
            );
        });
    }

    public getJsonFileByLink(link: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let cidMatches = link.match(this.cidPattern);
            this.getJsonFile((cidMatches && cidMatches[0]) || '').subscribe(
                (res) => {
                    resolve(res);
                },
                reject
            );
        });
    }
}
