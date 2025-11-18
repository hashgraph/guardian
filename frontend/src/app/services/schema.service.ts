import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema, ISchemaDeletionPreview, SchemaCategory, SchemaEntity, SchemaNode } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { AuthService } from './auth.service';
import { headersV2 } from '../constants';

type ITask = { taskId: string, expectation: number };

/**
 * Services for working from Schemas.
 */
@Injectable()
export class SchemaService {
    private readonly url: string = `${API_BASE_URL}/schemas`;
    private readonly singleSchemaUrl: string = `${API_BASE_URL}/schema`;

    constructor(
        private http: HttpClient,
        private auth: AuthService,
    ) {
    }

    public static getOptions(filters?: {
        pageIndex?: number,
        pageSize?: number,
        [key: string]: any
    }): HttpParams {
        let params = new HttpParams();
        if (filters && typeof filters === 'object') {
            for (const key of Object.keys(filters)) {
                if (filters[key] !== undefined && filters[key] !== null) {
                    if (key !== 'pageIndex' && key !== 'pageSize') {
                        params = params.set(key, filters[key]);
                    }
                }
            }
            if (Number.isInteger(filters.pageIndex) && Number.isInteger(filters.pageSize)) {
                params = params.set('pageIndex', String(filters.pageIndex));
                params = params.set('pageSize', String(filters.pageSize));
            }
        }
        return params;
    }

    public create(category: SchemaCategory, schema: ISchema, topicId: any): Observable<ISchema[]> {
        schema.category = category;
        return this.http.post<any[]>(`${this.url}/${topicId || null}`, schema);
    }

    public pushCreate(category: SchemaCategory, schema: ISchema, topicId: any): Observable<ITask> {
        schema.category = category;
        return this.http.post<ITask>(`${this.url}/push/${topicId || null}`, schema);
    }

    public update(schema: ISchema, id?: string): Observable<ISchema[]> {
        const data = Object.assign({}, schema, { id: id || schema.id });
        return this.http.put<any[]>(`${this.url}`, data);
    }

    public newVersion(category: SchemaCategory, schema: ISchema, id?: string): Observable<ITask> {
        const data = Object.assign({}, schema, { id: id || schema.id });
        schema.category = category;
        return this.http.post<ITask>(`${this.url}/push/${data.topicId || null}`, data);
    }

    public list(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/list/all`);
    }

    public getSchemas(topicId?: string): Observable<ISchema[]> {
        if (topicId) {
            return this.http.get<ISchema[]>(`${this.url}/${topicId}`);
        }
        return this.http.get<ISchema[]>(`${this.url}`);
    }

    public getSchemaWithSubSchemas(
        category: string,
        schemaId?: string,
        topicId?: string,
    ): Observable<Record<string, any>> {
        let url = `${this.url}/schema-with-sub-schemas?category=${category}`;

        if (schemaId) {
            url += `&schemaId=${schemaId}`;
        }
        if (topicId) {
            url += `&topicId=${topicId}`;
        }

        return this.http.get<any[]>(url);
    }

    public getSchemasByPolicy(policyId: string, pageIndex: number = 0, pageSize: number = 1000): Observable<ISchema[]> {
        return this.http.get<ISchema[]>(`${this.url}?policyId=${policyId}&pageIndex=${pageIndex}&pageSize=${pageSize}`);
    }

    public getSchemasByPage(options?: {
        category?: SchemaCategory,
        topicId?: string,
        search?: string,
        pageIndex?: number,
        pageSize?: number,
    }): Observable<HttpResponse<ISchema[]>> {
        const params = SchemaService.getOptions(options);
        return this.http.get<any>(`${this.url}`, { observe: 'response', headers: headersV2, params });
    }

    public getSchemasByType(type: string): Observable<ISchema> {
        return this.http.get<ISchema>(`${this.url}/type/${type}`);
    }

    public getSchemasByTypeAndUser(type: string): Observable<ISchema> {
        return this.http.get<ISchema>(`${this.url}/type-by-user/${type}`);
    }

    public publish(id: string, version: string): Observable<ISchema[]> {
        return this.http.put<any[]>(`${this.url}/${id}/publish`, { version });
    }

    public pushPublish(id: string, version: string): Observable<ITask> {
        return this.http.put<ITask>(`${this.url}/push/${id}/publish`, { version });
    }

    public unpublished(id: string): Observable<ISchema[]> {
        return this.http.put<any[]>(`${this.url}/${id}/unpublish`, null);
    }

    public delete(id: string, includeChildren?: boolean): Observable<ISchema[]> {
        return this.http.delete<any[]>(`${this.url}/${id}`, {
            params: {
                includeChildren: includeChildren ? true : false
            }
        });
    }

    public exportInFile(id: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${id}/export/file`, {
            responseType: 'arraybuffer',
        });
    }

    public exportInMessage(id: string): Observable<ISchema[]> {
        return this.http.get<any[]>(`${this.url}/${id}/export/message`);
    }

    public pushImportByMessage(messageId: string, topicId: any, schemasForReplace?: string[]): Observable<ITask> {
        var query = schemasForReplace?.length ? `?schemas=${schemasForReplace.join(',')}` : '';

        return this.http.post<ITask>(`${this.url}/push/${topicId || null}/import/message${query}`, { messageId });
    }

    public pushImportByFile(schemasFile: any, topicId: any, schemasForReplace?: string[]): Observable<ITask> {
        var query = schemasForReplace?.length ? `?schemas=${schemasForReplace.join(',')}` : '';

        return this.http.post<ITask>(`${this.url}/push/${topicId || null}/import/file${query}`, schemasFile, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public previewByMessage(messageId: string): Observable<ISchema> {
        return this.http.post<any>(`${this.url}/import/message/preview`, { messageId });
    }

    public pushPreviewByMessage(messageId: string): Observable<ITask> {
        return this.http.post<ITask>(`${this.url}/push/import/message/preview`, { messageId });
    }

    public previewByFile(schemasFile: any): Observable<ISchema[]> {
        return this.http.post<any>(`${this.url}/import/file/preview`, schemasFile, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public createSystemSchemas(schema: ISchema): Observable<ISchema> {
        const username = encodeURIComponent(this.auth.getUsername());
        return this.http.post<any>(`${this.url}/system/${username}`, schema);
    }

    public getSystemSchemas(options?: {
        pageIndex?: number,
        pageSize?: number
    }): Observable<HttpResponse<ISchema[]>> {
        const username = encodeURIComponent(this.auth.getUsername());
        const url = `${this.url}/system/${username}`;
        const params = SchemaService.getOptions(options);
        return this.http.get<any>(url, { observe: 'response', headers: headersV2, params });
    }

    public deleteSystemSchema(id: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/system/${id}`);
    }

    public updateSystemSchema(schema: ISchema, id?: string): Observable<ISchema[]> {
        const data = Object.assign({}, schema, { id: id || schema.id });
        return this.http.put<any[]>(`${this.url}/system/${id}`, data);
    }

    public activeSystemSchema(id: string): Observable<any> {
        return this.http.put<any>(`${this.url}/system/${id}/active`, null);
    }

    public getSystemSchemasByEntity(entity: SchemaEntity): Observable<ISchema> {
        return this.http.get<ISchema>(`${this.url}/system/entity/${entity}`);
    }

    public copySchema(copyInfo: any) {
        return this.http.post<ITask>(`${this.url}/push/copy`, copyInfo);
    }

    public getSchemaParents(id: string): Observable<ISchema[]> {
        return this.http.get<ISchema[]>(`${this.singleSchemaUrl}/${id}/parents`);
    }

    public getSchemaTree(id: string): Observable<SchemaNode> {
        return this.http.get<SchemaNode>(`${this.singleSchemaUrl}/${id}/tree`);
    }

    public getSchemaDeletionPreview(schemaIds: string[]): Observable<ISchemaDeletionPreview> {
        let params = new HttpParams();
        if (schemaIds?.length) {
            params = params.set('schemaIds', JSON.stringify(schemaIds));
        }
        return this.http.get<ISchemaDeletionPreview>(`${this.singleSchemaUrl}/deletionPreview`, { params });
    }

    public deleteSchemasByTopicId(topicId: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/topic/${topicId}`, {});
    }

    public properties(): Observable<any[]> {
        return this.http.get<any>(`${API_BASE_URL}/projects/properties`);
    }

    public exportToExcel(id: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${id}/export/xlsx`, {
            responseType: 'arraybuffer',
        });
    }

    public downloadExcelExample(): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/export/template`, {
            responseType: 'arraybuffer',
        });
    }

    public previewByXlsx(file: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/import/xlsx/preview`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }

    public checkForDublicates(data: { schemaNames: string[]; policyId: string }): Observable<any> {
        return this.http.post<any>(`${this.url}/import/schemas/duplicates`, data);
    }

    public pushImportByXlsx(schemasFile: any, topicId: any, schemasForReplace?: string[]): Observable<{ taskId: string, expectation: number }> {
        var query = schemasForReplace?.length ? `?schemas=${schemasForReplace.join(',')}` : '';

        return this.http.post<ITask>(`${this.url}/push/${topicId || null}/import/xlsx${query}`, schemasFile, {
            headers: {
                'Content-Type': 'binary/octet-stream',
            },
        });
    }
}
