import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { API_BASE_URL } from './api';
import { ipfsCid, ipfsDryRunId, ipfsFileType } from '../utils/ipfs-file';
import { SILENT_HTTP_ERRORS } from '../constants/http-context-tokens';

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

    public getFileFromDryRunStorage(cid: string, silent = false): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/file/${cid}/dry-run`, {
            responseType: 'arraybuffer',
            context: new HttpContext().set(SILENT_HTTP_ERRORS, silent),
        });
    }

    public getDryRunFile(value: string): Observable<Blob> {
        const id = ipfsDryRunId(value);
        if (!id) {
            return throwError(() => new Error('File not found'));
        }
        return this.getFileFromDryRunStorage(encodeURIComponent(id), true)
            .pipe(map((bytes) => new Blob([bytes], { type: ipfsFileType(bytes) })));
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
