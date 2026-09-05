import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchemaTemplate } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

interface TaskResponse {
    taskId: string;
    expectation: number;
}

export interface SchemaTemplateGridItem extends ISchemaTemplate {
    schemasCount?: number;
    usedByPoliciesCount?: number;
    usedByPolicyNames?: string[];
}

export enum SchemaTemplateUpdateResolutionAction {
    KEEP_AS_CUSTOM_SCHEMA = 'KEEP_AS_CUSTOM_SCHEMA',
    REMOVE_FROM_POLICY = 'REMOVE_FROM_POLICY'
}

export interface SchemaTemplateUpdateConflict {
    id: string;
    message: string;
    allowedActions: SchemaTemplateUpdateResolutionAction[];
}

export interface SchemaTemplateUpdatePreview {
    previousTemplateName?: string;
    previousTemplateVersion?: string;
    templateName?: string;
    templateVersion?: string;
    changes: Array<{
        type: string;
        schemaName?: string;
        fieldName?: string;
        before?: string;
        after?: string;
        details?: Array<{
            label: string;
            before?: string;
            after?: string;
        }>;
        message: string;
    }>;
    conflicts: SchemaTemplateUpdateConflict[];
}

export interface SchemaTemplateUpdateOptions {
    resolutions?: Array<{
        conflictId: string;
        action: SchemaTemplateUpdateResolutionAction;
    }>;
    targetTemplateId?: string;
}

export interface SchemaTemplateDetachOptions {
    deleteSchemas?: boolean;
}

@Injectable()
export class SchemaTemplatesService {
    private readonly url: string = `${API_BASE_URL}/schema-templates`;

    constructor(private readonly http: HttpClient) {
    }

    public page(
        pageIndex: number = 0,
        pageSize: number = 20,
        search?: string
    ): Observable<HttpResponse<SchemaTemplateGridItem[]>> {
        const params = new HttpParams()
            .set('pageIndex', String(pageIndex))
            .set('pageSize', String(pageSize))
            .set('search', search || '');
        return this.http.get<SchemaTemplateGridItem[]>(this.url, {
            observe: 'response',
            params
        });
    }

    public getById(id: string): Observable<SchemaTemplateGridItem> {
        return this.http.get<SchemaTemplateGridItem>(`${this.url}/${id}`);
    }

    /** One entry per template applied to the policy that owns this topic. */
    public getAppliedByPolicyTopic(topicId: string): Observable<SchemaTemplateGridItem[]> {
        return this.http.get<SchemaTemplateGridItem[]>(`${this.url}/policies/topic/${topicId}/applied`);
    }

    public create(template: Partial<ISchemaTemplate>): Observable<SchemaTemplateGridItem> {
        return this.http.post<SchemaTemplateGridItem>(`${this.url}/`, template);
    }

    public pushCreate(template: Partial<ISchemaTemplate>): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/push`, template);
    }

    public pushNewVersion(id: string): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/${id}/push/new-version`, {});
    }

    public update(id: string, template: Partial<ISchemaTemplate>): Observable<SchemaTemplateGridItem> {
        return this.http.put<SchemaTemplateGridItem>(`${this.url}/${id}`, template);
    }

    public delete(id: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/${id}`);
    }

    public pushDelete(id: string): Observable<TaskResponse> {
        return this.http.delete<TaskResponse>(`${this.url}/push/${id}`);
    }

    public pushPublish(id: string, options: { templateVersion: string }): Observable<TaskResponse> {
        return this.http.put<TaskResponse>(`${this.url}/${id}/push/publish`, options);
    }

    public exportInFile(id: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${id}/export/file`, {
            responseType: 'arraybuffer'
        });
    }

    public exportInMessage(id: string): Observable<any> {
        return this.http.get(`${this.url}/${id}/export/message`);
    }

    public previewByMessage(messageId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/import/message/preview`, { messageId });
    }

    public checkMessage(messageId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/check/${messageId}`);
    }

    public previewByFile(file: any): Observable<any> {
        return this.http.post<any>(`${this.url}/import/file/preview`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public pushImportByMessage(messageId: string): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/push/import/message`, { messageId });
    }

    public pushImportByFile(file: any): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/push/import/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public pushApply(templateId: string, policyId: string): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/${templateId}/policies/${policyId}/push/apply`, {});
    }

    public previewUpdate(templateId: string, policyId: string, targetTemplateId?: string): Observable<SchemaTemplateUpdatePreview> {
        let params = new HttpParams();
        if (targetTemplateId) {
            params = params.set('targetTemplateId', targetTemplateId);
        }
        return this.http.get<SchemaTemplateUpdatePreview>(`${this.url}/${templateId}/policies/${policyId}/update/preview`, { params });
    }

    public pushUpdate(templateId: string, policyId: string, options: SchemaTemplateUpdateOptions): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/${templateId}/policies/${policyId}/push/update`, options || {});
    }

    public pushDetach(templateId: string, policyId: string, options?: SchemaTemplateDetachOptions): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${this.url}/${templateId}/policies/${policyId}/push/detach`, options || {});
    }
}
