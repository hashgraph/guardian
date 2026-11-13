import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ipfsCid } from '../utils/ipfs-file';

/**
 * Services for working from user profile.
 */
@Injectable()
export class IPFSService {
    private readonly url: string = `${API_BASE_URL}/ipfs`;
    constructor(private http: HttpClient) { }

    public addFile(file: any): Observable<any> {
        return this.http.post<string>(`${this.url}/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public addFileDirect(file: any): Observable<any> {
        return this.http.post<string>(`${this.url}/file/direct`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public addFileDryRun(file: any, policyId: string): Observable<any> {
        return this.http.post<string>(`${this.url}/file/dry-run/${policyId}`, file, {
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

    public getFileFromDryRunStorage(cid: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/file/${cid}/dry-run`, {
            responseType: 'arraybuffer',
        });
    }

    public getJsonFile(cid: string): Observable<any> {
        return this.http.get<any>(`${this.url}/file/${cid}`);
    }

    public getImageByLink(link: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.getFile(ipfsCid(link)).subscribe(
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

    public getImageFromDryRunStorage(link: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const imageIdMatches = link.match(/.+\/\/(.+)/);
            this.getFileFromDryRunStorage((imageIdMatches && imageIdMatches[1]) || '').subscribe(
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

    public getImageWithDryRunFallback(link: string, dryRun: boolean): Promise<string> {
        if (!dryRun) {
            return this.getImageByLink(link);
        }
        return this.getImageFromDryRunStorage(link).catch(() => this.getImageByLink(link));
    }

    public getJsonFileByLink(link: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getJsonFile(ipfsCid(link))
                .subscribe(
                    (res) => {
                        resolve(res);
                    },
                    reject
                );
        });
    }

    public loadJsonFileByLink(link: string): Observable<any> {
        return this.getJsonFile(ipfsCid(link))
    }

    public deleteCid(cid: string): Observable<void> {
        const encodedCid = encodeURIComponent(cid);
        return this.http.delete<void>(`${this.url}/file/${encodedCid}`, {});
    }
}
