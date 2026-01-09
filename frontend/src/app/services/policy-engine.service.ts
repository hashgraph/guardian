import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MigrationConfig, PolicyAvailability, PolicyToolMetadata } from '@guardian/interfaces';
import { Observable, firstValueFrom, map } from 'rxjs';
import { headersV2 } from '../constants';
import { API_BASE_URL } from './api';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class PolicyEngineService {
    private readonly url: string = `${API_BASE_URL}/policies`;

    constructor(private http: HttpClient) {
    }

    public static getOptions(
        filters: any,
        pageIndex?: number,
        pageSize?: number
    ): HttpParams {
        let params = new HttpParams();
        if (filters && typeof filters === 'object') {
            for (const key of Object.keys(filters)) {
                if (filters[key]) {
                    params = params.set(key, filters[key]);
                }
            }
        }
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            params = params.set('pageIndex', String(pageIndex));
            params = params.set('pageSize', String(pageSize));
        }
        return params;
    }

    public all(type?: string): Observable<any[]> {
        if (type) {
            return this.http.get<any[]>(`${this.url}?type=${type}`);
        }
        return this.http.get<any[]>(`${this.url}`);
    }

    public page(
        pageIndex?: number,
        pageSize?: number,
        type?: string
    ): Observable<HttpResponse<any[]>> {
        const filters: any = {};
        const header: any = { observe: 'response' };
        if (type) {
            filters.type = type;
        }
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            header.headers = headersV2;
        }
        header.params = PolicyEngineService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any[]>(`${this.url}`, header) as any;
    }

    public allWithImportedRecords(policyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/with-imported-records/${policyId}`);
    }
    

    public create(policy: any): Observable<void> {
        return this.http.post<any>(`${this.url}/`, policy);
    }

    public pushCreate(policy: any): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push`, policy);
    }

    public pushClone(policyId: string, policy: any): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/${policyId}`, policy);
    }

    public policy(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}`);
    }

    public update(policyId: string, policy: any): Observable<void> {
        return this.http.put<any>(`${this.url}/${policyId}`, policy);
    }

    public publish(
        policyId: string,
        options: { policyVersion: string, policyAvailability: PolicyAvailability }
    ): Observable<any> {
        return this.http.put<any>(`${this.url}/${policyId}/publish`, options);
    }

    public dryRun(policyId: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${policyId}/dry-run`, null);
    }

    public discontinue(policyId: string, details: { date?: Date }): Observable<any> {
        return this.http.put<any>(`${this.url}/${policyId}/discontinue`, details);
    }

    public draft(policyId: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${policyId}/draft`, null);
    }

    public pushPublish(
        policyId: string,
        options: { policyVersion: string, policyAvailability: PolicyAvailability, recordingEnabled: boolean }
    ): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${policyId}/publish`, options);
    }

    public pushDelete(policyId: string): Observable<{ taskId: string, expectation: number }> {
        return this.http.delete<{ taskId: string, expectation: number }>(`${this.url}/push/${policyId}`);
    }

    public pushDeleteMultiple(policyIds: string[]): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/delete-multiple`, { policyIds });
    }

    public validate(policy: any): Observable<any> {
        return this.http.post<any>(`${this.url}/validate`, policy);
    }

    public policyBlock(policyId: string, savepointIds: string[] | null): Observable<any> {
        let params = new HttpParams();

        if (savepointIds) {
            params = params.set('savepointIds', JSON.stringify(savepointIds));
        }

        return this.http.get<any>(`${this.url}/${policyId}/blocks`, { params });
    }

    public getBlockData<T>(blockId: string, policyId: string, savepointIds?: string[] | null): Observable<T> {
        let params = new HttpParams();

        if (savepointIds) {
            params = params.set('savepointIds', JSON.stringify(savepointIds));
        }

        return this.http.get<T>(`${this.url}/${policyId}/blocks/${blockId}`, { params });
    }

    public getBlockDataByName(blockName: string, policyId: string, savepointIds?: string[] | null): Observable<any> {
        let params = new HttpParams();

        if (savepointIds) {
            params = params.set('savepointIds', JSON.stringify(savepointIds));
        }
        return this.http.get<any>(`${this.url}/${policyId}/tag/${blockName}/blocks`, { params });
    }

    public setBlockData(blockId: string, policyId: string, data: any): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/blocks/${blockId}/sync-events?history=true`, data).pipe(map(res => res.response));
        // return this.http.post<void>(`${this.url}/${policyId}/blocks/${blockId}`, data);
    }

    public getGetIdByName(blockName: string, policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/tag/${blockName}`);
    }

    public getParents(blockId: string, policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks/${blockId}/parents`);
    }

    public exportInFile(policyId: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${policyId}/export/file`, {
            responseType: 'arraybuffer'
        });
    }

    public exportToExcel(policyId: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${policyId}/export/xlsx`, {
            responseType: 'arraybuffer'
        });
    }

    public exportInMessage(policyId: string): Observable<any> {
        return this.http.get(`${this.url}/${policyId}/export/message`);
    }

    public pushImportByMessage(
        messageId: string,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata,
        demo?: boolean,
        originalTracking?: boolean
    ): Observable<{ taskId: string; expectation: number }> {
        let params = new HttpParams();
        if (versionOfTopicId) {
            params = params.set('versionOfTopicId', versionOfTopicId);
        }
        if (demo) {
            params = params.set('demo', demo);
        }
        if (originalTracking) {
            params = params.set('originalTracking', originalTracking);
        }
        return this.http.post<{ taskId: string; expectation: number }>(
            `${this.url}/push/import/message`,
            { messageId, metadata },
            { params }
        );
    }

    public pushImportByFile(
        policyFile: any,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata,
        demo?: boolean,
        originalTracking?: boolean
    ): Observable<{ taskId: string; expectation: number }> {
        let params = new HttpParams();
        if (versionOfTopicId) {
            params = params.set('versionOfTopicId', versionOfTopicId);
        }
        if (demo) {
            params = params.set('demo', demo);
        }

        if(originalTracking) {
            params = params.set('originalTracking', originalTracking);
        }

        const formData = new FormData();
        formData.append('policyFile', new Blob([policyFile], { type: 'application/octet-stream' }));
        if (metadata) {
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        }
        return this.http.post<{ taskId: string; expectation: number }>(
            `${this.url}/push/import/file-metadata`,
            formData,
            { params }
        );
    }

    public previewByMessage(messageId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/import/message/preview`, { messageId });
    }

    public pushPreviewByMessage(messageId: string): Observable<{ taskId: string, expectation: number }> {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/import/message/preview`, { messageId });
    }

    public previewByFile(policyFile: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/import/file/preview`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public previewByXlsx(policyFile: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/import/xlsx/preview`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public importByXlsx(policyFile: any, policyId: string): Observable<any[]> {
        var query = policyId ? `?policyId=${policyId}` : '';
        return this.http.post<any[]>(`${this.url}/import/xlsx${query}`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public pushImportByXlsx(policyFile: any, policyId: string, schemasForReplace?: string[]): Observable<{ taskId: string, expectation: number }> {
        var query = policyId ? `?policyId=${policyId}` : '';
        if (schemasForReplace?.length) {
            if (query) {
                query = `${query}&schemas=${schemasForReplace.join(',')}`
            } else {
                query = `?schemas=${schemasForReplace.join(',')}`
            }
        }
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/import/xlsx${query}`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public getBlockInformation(): Observable<any> {
        return this.http.get<any>(`${this.url}/blocks/about`);
    }

    public getVirtualUsers(policyId: string, savepointIds: string[] | null): Observable<any[]> {
        let params = new HttpParams();

        if (savepointIds?.length) {
            params = params.set('savepointIds', JSON.stringify(savepointIds));
        }

        return this.http.get<any[]>(`${this.url}/${policyId}/dry-run/users`, { params });
    }

    public createVirtualUser(policyId: string, savepointIds: string[] | null): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/dry-run/user`, { savepointIds });
    }

    public loginVirtualUser(policyId: string, did: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/dry-run/login`, { did });
    }

    public restartDryRun(policyId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/dry-run/restart`, null);
    }

    public runBlock(policyId: string, config: any): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/dry-run/block`, config);
    }

    public getBlockHistory(policyId: string, tag: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/dry-run/block/${tag}/history`);
    }

    public getSavepoints(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/savepoints`);
    }

    public getSavepointsCount(
        policyId: string,
        includeDeleted = false
    ): Observable<any> {
        let params = new HttpParams();
        if (includeDeleted) {
            params = params.set('includeDeleted', 'true');
        }
        return this.http.get<any>(
            `${this.url}/${policyId}/savepoints/count`,
            { params }
        );
    }

    public createSavepoint(
        policyId: string,
        body: { name: string; savepointPath: string[] }
    ): Observable<{ savepoint: any }> {
        return this.http.post<{ savepoint: any }>(
            `${this.url}/${policyId}/savepoints`,
            body
        );
    }

    public updateSavepoint(policyId: string, savepointId: string, body: { name: string }) {
        return this.http.patch<void>(
            `${this.url}/${policyId}/savepoints/${savepointId}`,
            body
        );
    }

    public selectSavepoint(
        policyId: string,
        savepointId: string
    ): Observable<{ savepoint: any }> {
        return this.http.put<{ savepoint: any }>(
            `${this.url}/${policyId}/savepoints/${savepointId}`,
            null
        );
    }

    public deleteSavepoints(
        policyId: string,
        savepointIds: string[],
        skipCurrentSavepointGuard = false
    ): Observable<{ hardDeletedIds: string[] }> {
        return this.http.post<{ hardDeletedIds: string[] }>(
            `${this.url}/${policyId}/savepoints/delete`,
            { savepointIds, skipCurrentSavepointGuard }
        );
    }

    public loadDocuments(
        policyId: string,
        documentType: string,
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}/${policyId}/dry-run/${documentType}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
        }
        return this.http.get<any>(`${this.url}/${policyId}/dry-run/${documentType}`, { observe: 'response' });
    }

    public documents(
        policyId: string,
        includeDocument: boolean = false,
        type: string,
        pageIndex?: number,
        pageSize?: number,
        filters?: any
    ): Observable<HttpResponse<any[]>> {
        filters = filters || {};
        if (includeDocument) {
            filters.includeDocument = includeDocument;
        }
        if (type) {
            filters.type = type;
        }
        const params = PolicyEngineService.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/${policyId}/documents`, { observe: 'response', params });
    }

    public searchDocuments(
        policyId: string,
        filters: any,
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        const params = this.getOptions(filters, pageIndex, pageSize);
        return this.http.get<any>(`${this.url}/${policyId}/search-documents`, { observe: 'response', params });
    }

    public exportDocuments(
        policyId: string,
        filters: any,
    ): Observable<ArrayBuffer> {
        const params = this.getOptions(filters);
        return this.http.get(`${this.url}/${policyId}/export-documents`, { responseType: 'arraybuffer', params });
    }

    public getPolicyDocumentOwners(
        policyId: string,
    ): Observable<string[]> {
        return this.http.get<string[]>(`${this.url}/${policyId}/document-owners`);
    }

    public getPolicyTokens(
        policyId: string,
    ): Observable<string[]> {
        return this.http.get<string[]>(`${this.url}/${policyId}/tokens`);
    }

    public migrateData(migrationConfig: MigrationConfig) {
        return this.http.post<{ error: string, id: string }[]>(`${this.url}/migrate-data`, migrationConfig);
    }

    public migrateDataAsync(migrationConfig: MigrationConfig) {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/migrate-data`, migrationConfig);
    }

    public getGroups(policyId: string, savepointIds: string[] | null): Observable<any[]> {
        let params = new HttpParams();

        if (savepointIds?.length) {
            params = params.set('savepointIds', JSON.stringify(savepointIds));
        }

        return this.http.get<any[]>(`${this.url}/${policyId}/groups`, { params });
    }

    public setGroup(policyId: string, uuid: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/groups`, { uuid });
    }

    public getMultiPolicy(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/multiple`);
    }

    public setMultiPolicy(policyId: string, data: any): Observable<any> {
        return this.http.post<void>(`${this.url}/${policyId}/multiple`, data);
    }

    public getPolicyNavigation(policyId: string, savepointIds?: string[] | null): Observable<any> {
        let params = new HttpParams();

        if (savepointIds) {
            params = params.set('savepointIds', JSON.stringify(savepointIds));
        }

        return this.http.get<void>(`${this.url}/${policyId}/navigation`, { params });
    }

    public getPolicyCategories(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/methodologies/categories`);
    }

    public getMethodologies(categoryIds?: string[], text?: string): Observable<any[]> {
        return this.http.post<any[]>(`${this.url}/methodologies/search`, { categoryIds, text });
    }

    public exportPolicyData(policyId: string) {
        return this.http.get(`${this.url}/${policyId}/data`, {
            responseType: 'blob',
            observe: 'response',
        });
    }

    public exportVirtualKeys(policyId: string) {
        return this.http.get(`${this.url}/${policyId}/virtual-keys`, {
            responseType: 'blob',
            observe: 'response',
        });
    }

    public getTagBlockMap(policyId: string) {
        return this.http.get<any>(`${this.url}/${policyId}/tag-block-map`);
    }

    public importData(data: any) {
        return this.http.post<string>(`${this.url}/data`, data, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public importVirtualKeys(policyId: string, data: any) {
        return this.http.post<string>(
            `${this.url}/${policyId}/virtual-keys`,
            data,
            {
                headers: {
                    'Content-Type': 'binary/octet-stream',
                },
            }
        );
    }

    // public addPolicyTest(policyId: string, testFile: any): Observable<any> {
    //     return this.http.post<any[]>(`${this.url}/${policyId}/test/`, testFile, {
    //         headers: {
    //             'Content-Type': 'binary/octet-stream'
    //         }
    //     });
    // }

    public runTest(policyId: string, testId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/test/${testId}/start`, null);
    }

    public stopTest(policyId: string, testId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/test/${testId}/stop`, null);
    }

    public getTestDetails(policyId: string, testId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/test/${testId}/details`);
    }

    public deleteTest(policyId: string, testId: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/${policyId}/test/${testId}`);
    }

    public addPolicyTest(policyId: string, files: File[]): Observable<any[]> {
        const formData = new FormData();
        for (const file of files) {
            formData.append('tests', file);
        }
        return this.http.post<any[]>(`${this.url}/${policyId}/test/`, formData);
    }

    public parsePage(response: HttpResponse<any[]>) {
        const page = response.body || [];
        const count = Number(response.headers.get('X-Total-Count')) || page.length;
        return { page, count };
    }

    public getOptions(
        filters: any,
        pageIndex?: number,
        pageSize?: number
    ): HttpParams {
        let params = new HttpParams();
        if (filters && typeof filters === 'object') {
            for (const key of Object.keys(filters)) {
                if (filters[key]) {
                    params = params.set(key, filters[key]);
                }
            }
        }
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            params = params.set('pageIndex', String(pageIndex));
            params = params.set('pageSize', String(pageSize));
        }
        return params;
    }

    public sendData(url: string, data: any, token: string): Observable<any> {
        return this.http.post<string>(url, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
    }

    public customRequest(type: string, url: string, data: any, headers: any): Observable<any> {
        switch (type) {
            case 'post': {
                if (headers) {
                    return this.http.post<any>(url, data, { headers });
                } else {
                    return this.http.post<any>(url, data);
                }
            }
            case 'get': {
                if (headers) {
                    return this.http.get<any>(url, { headers });
                } else {
                    return this.http.get<any>(url);
                }
            }
            case 'put': {
                if (headers) {
                    return this.http.put<any>(url, data, { headers });
                } else {
                    return this.http.put<any>(url, data);
                }
            }
            default:
                throw new Error(`Invalid request type ${type}`);
        }
    }

    public createNewVersionVcDocument(policyId?: string, data?: any): Observable<any> {
        return this.http.post<void>(`${this.url}/${policyId}/create-new-version-vc-document/`, data);
    }

    public getAllVersionVcDocuments(policyId?: string, documentId?: string): Observable<any> {
        return this.http.get<void>(`${this.url}/${policyId}/get-all-version-vc-documents/${documentId}`);
    }
}
