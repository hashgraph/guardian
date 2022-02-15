import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema, Schema, SchemaEntity } from 'interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from Schemes.
 */
@Injectable()
export class SchemaService {
  private readonly url: string = `${API_BASE_URL}/schemas`;

  constructor(
    private http: HttpClient
  ) {
  }

  public create(schema: Schema): Observable<ISchema[]> {
    return this.http.post<any[]>(`${this.url}`, schema);
  }

  public update(schema: Schema, id?: string): Observable<ISchema[]> {
    const data = Object.assign({}, schema, { id: id || schema.id });
    return this.http.put<any[]>(`${this.url}`, data);
  }

  public newVersion(schema: Schema, id?: string): Observable<ISchema[]> {
    const data = Object.assign({}, schema, { id: id || schema.id });
    return this.http.post<any[]>(`${this.url}`, data);
  }

  public getSchemes(): Observable<ISchema[]> {
    return this.http.get<any[]>(`${this.url}`);
  }

  public publish(id: string, version: string): Observable<ISchema[]> {
    return this.http.put<any[]>(`${this.url}/${id}/publish`, { version });
  }

  public unpublished(id: string): Observable<ISchema[]> {
    return this.http.put<any[]>(`${this.url}/${id}/unpublish`, null);
  }

  public delete(id: string): Observable<ISchema[]> {
    return this.http.delete<any[]>(`${this.url}/${id}`);
  }

  public exportInFile(id: string): Observable<Blob> {
    return this.http.get(`${this.url}/${id}/export/file`, {
      responseType: 'blob'
    });
  }

  public exportInMessage(id: string): Observable<ISchema[]> {
    return this.http.get<any[]>(`${this.url}/${id}/export/message`);
  }

  public importByMessage(messageId: string): Observable<ISchema[]> {
    return this.http.post<any[]>(`${this.url}/import/message`, { messageId });
  }

  public importByFile(schemesFile: any): Observable<ISchema[]> {
    return this.http.post<any[]>(`${this.url}/import/file`, schemesFile, {
      headers: {
        'Content-Type': 'binary/octet-stream'
      }
    });
  }

  public previewByMessage(messageId: string): Observable<ISchema> {
    return this.http.post<any>(`${this.url}/import/message/preview`, { messageId });
  }

  public previewByFile(schemesFile: any): Observable<ISchema[]> {
    return this.http.post<any[]>(`${this.url}/import/file/preview`, schemesFile, {
      headers: {
        'Content-Type': 'binary/octet-stream'
      }
    });
  }
}