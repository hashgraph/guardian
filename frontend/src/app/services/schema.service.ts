import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISchema, SchemaEntity } from 'interfaces';
import { Observable } from 'rxjs';

@Injectable()
export class SchemaService {
  constructor(
    private http: HttpClient
  ) {
  }

  public createSchema(
    type: string,
    entity: SchemaEntity,
    isDefault: boolean,
    document: any
  ): Observable<ISchema[]> {
    return this.http.post<any[]>('/api/schema/create', { type, entity, document, isDefault });
  }

  public getSchemes(): Observable<ISchema[]> {
    return this.http.get<any[]>('/api/schema/');
  }

  public getSchemesByEntity(): Observable<ISchema[]> {
    return this.http.get<any[]>(`/api/schema/by-entity`);
  }

  public importSchemes(schemes: any[]): Observable<ISchema[]> {
    return this.http.post<any[]>(`/api/schema/import`, { schemes });
  }

  public exportSchemes(ids: string[]): Observable<any> {
    return this.http.post<any[]>(`/api/schema/export`, { ids });
  }
}