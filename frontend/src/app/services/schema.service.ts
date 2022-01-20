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

  public import(schemes: any[]): Observable<ISchema[]> {
    return this.http.post<any[]>(`${this.url}/import`, { schemes });
  }

  public export(ids: string[]): Observable<any> {
    return this.http.post<any[]>(`${this.url}/export`, { ids });
  }
}