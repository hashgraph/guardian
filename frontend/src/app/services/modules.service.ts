import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
/**
 * Services for working from user profile.
 */
@Injectable()
export class ModulesService {
    private readonly url: string = `${API_BASE_URL}/modules`;
    constructor(
        private http: HttpClient
    ) { }

    public page(pageIndex?: number, pageSize?: number): Observable<HttpResponse<any[]>> {
        if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            return this.http.get<any>(`${this.url}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { observe: 'response' });
        }
        return this.http.get<any>(`${this.url}`, { observe: 'response' });
    }

    public getById(uuid: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${uuid}`);
    }

    public create(module: any): Observable<void> {
        return this.http.post<any>(`${this.url}/`, module);
    }

    public delete(uuid: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.url}/${uuid}`);
    }

    public menuList(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/menu`);
    }

    public update(uuid: string, module: any): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${uuid}`, module);
    }

    public show(uuid: string): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${uuid}/show`, null);
    }

    public hide(uuid: string): Observable<any> {
        return this.http.put<any[]>(`${this.url}/${uuid}/hide`, null);
    }
}