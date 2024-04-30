import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { MigrationConfig, PolicyToolMetadata } from '@guardian/interfaces';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class PolicyEngineService {
    private readonly url: string = `${API_BASE_URL}/policies`;

    constructor(private http: HttpClient) {
    }

    public all(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/`);
    }

    public page(pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
        }
        return this.http.get<any>(`${this.url}`, { observe: 'response' });
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

    public publish(policyId: string, policyVersion: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${policyId}/publish`, { policyVersion });
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

    public pushPublish(policyId: string, policyVersion: string): Observable<{ taskId: string, expectation: number }> {
        return this.http.put<{ taskId: string, expectation: number }>(`${this.url}/push/${policyId}/publish`, { policyVersion });
    }

    public pushDelete(policyId: string): Observable<{ taskId: string, expectation: number }> {
        return this.http.delete<{ taskId: string, expectation: number }>(`${this.url}/push/${policyId}`);
    }

    public validate(policy: any): Observable<any> {
        return this.http.post<any>(`${this.url}/validate`, policy);
    }

    public policyBlock(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks`);
    }

    public getBlockData(blockId: string, policyId: string, filters?: any): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks/${blockId}`, {
            // TODO: Is it used?
            params: filters
        });
    }

    public getBlockDataByName(blockName: string, policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/tag/${blockName}/blocks`);
    }

    public setBlockData(blockId: string, policyId: string, data: any): Observable<any> {
        return this.http.post<void>(`${this.url}/${policyId}/blocks/${blockId}`, data);
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
        metadata?: PolicyToolMetadata
    ): Observable<{ taskId: string; expectation: number }> {
        var query = versionOfTopicId
            ? `?versionOfTopicId=${versionOfTopicId}`
            : '';
        return this.http.post<{ taskId: string; expectation: number }>(
            `${this.url}/push/import/message${query}`,
            { messageId, metadata }
        );
    }

    public pushImportByFile(
        policyFile: any,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata
    ): Observable<{ taskId: string; expectation: number }> {
        var query = versionOfTopicId
            ? `?versionOfTopicId=${versionOfTopicId}`
            : '';
        const formData = new FormData();
        formData.append(
            'policyFile',
            new Blob([policyFile], { type: 'application/octet-stream' })
        );
        if (metadata) {
            formData.append(
                'metadata',
                new Blob([JSON.stringify(metadata)], {
                    type: 'application/json',
                })
            );
        }
        return this.http.post<{ taskId: string; expectation: number }>(
            `${this.url}/push/import/file-metadata${query}`,
            formData
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

    public pushImportByXlsx(policyFile: any, policyId: string): Observable<{ taskId: string, expectation: number }> {
        var query = policyId ? `?policyId=${policyId}` : '';
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/import/xlsx${query}`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public getBlockInformation(): Observable<any> {
        return this.http.get<any>(`${this.url}/blocks/about`);
    }

    public getVirtualUsers(policyId: string): Observable<any[]> {
        return this.http.get<any>(`${this.url}/${policyId}/dry-run/users`);
    }

    public createVirtualUser(policyId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/dry-run/user`, null);
    }

    public loginVirtualUser(policyId: string, did: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/dry-run/login`, { did });
    }

    public restartDryRun(policyId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/${policyId}/dry-run/restart`, null);
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
        pageSize?: number
    ): Observable<HttpResponse<any[]>> {
        const params: any = {}
        if (includeDocument) {
            params.includeDocument = includeDocument;
        }
        if (type) {
            params.type = type;
        }
        if (Number.isInteger(pageIndex)) {
            params.pageIndex = pageIndex;
        }
        if (Number.isInteger(pageSize)) {
            params.pageSize = pageSize;
        }
        return this.http.get<any>(`${this.url}/${policyId}/documents`, { observe: 'response', params });
    }

    public migrateData(migrationConfig: MigrationConfig) {
        return this.http.post<{ error: string, id: string }[]>(`${this.url}/migrate-data`, migrationConfig);
    }

    public migrateDataAsync(migrationConfig: MigrationConfig) {
        return this.http.post<{ taskId: string, expectation: number }>(`${this.url}/push/migrate-data`, migrationConfig);
    }

    public getGroups(policyId: string): Observable<any[]> {
        return this.http.get<any>(`${this.url}/${policyId}/groups`);
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

    public getPolicyNavigation(policyId: string): Observable<any> {
        return this.http.get<void>(`${this.url}/${policyId}/navigation`);
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
}
