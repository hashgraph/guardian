import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema, SchemaEntity } from 'interfaces';
import { Observable } from 'rxjs';

/**
 * Services for working from Schemes.
 */
@Injectable()
export class SchemaService {
  constructor(
    private http: HttpClient
  ) {
  }

  public createSchema(
    name: string,
    entity: SchemaEntity,
    document: string
  ): Observable<ISchema[]> {
    return this.http.post<any[]>('/api/schema/create', { name, entity, document });
  }

  public updateSchema(
    id: any,
    name: string,
    entity: SchemaEntity,
    document: string
  ): Observable<ISchema[]> {
    return this.http.post<any[]>('/api/schema/update', { id, name, entity, document });
  }

  public getSchemes(): Observable<ISchema[]> {
    return this.http.get<any[]>('/api/schema');
  }

  public importSchemes(schemes: any[]): Observable<ISchema[]> {
    return this.http.post<any[]>(`/api/schema/import`, { schemes });
  }

  public exportSchemes(ids: string[]): Observable<any> {
    return this.http.post<any[]>(`/api/schema/export`, { ids });
  }

  public publishSchema(id: any): Observable<ISchema[]> {
    return this.http.post<any[]>('/api/schema/publish', { id });
  }

  public unpublishedSchema(id: any): Observable<ISchema[]> {
    return this.http.post<any[]>('/api/schema/unpublished', { id });
  }

  public deleteSchema(id: any): Observable<ISchema[]> {
    return this.http.post<any[]>('/api/schema/delete', { id });
  }
}