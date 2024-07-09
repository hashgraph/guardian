import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable({
    providedIn: 'root',
})
export class WorkerTasksService{
    private readonly url: string = `${API_BASE_URL}/worker-tasks`;

    constructor(private http: HttpClient) {
    }

    public all(
        pageIndex?: any,
        pageSize?: any
    ): Observable<HttpResponse<any[]>> {
        const parameters = {
            pageIndex,
            pageSize,
        } as any;
        return this.http.get<any>(`${this.url}`, {
            observe: 'response',
            params: parameters,
        });
    }

    public restartTask(taskId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/restart`, {taskId})
    }

    public deleteTask(taskId: string): Observable<any> {
        return this.http.delete<any>(`${this.url}/delete/${taskId}`)
    }
}
