import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable()
export class TasksService {
  private readonly url: string = `${API_BASE_URL}/tasks`;

  constructor(private http: HttpClient) {
  }

  public get(taskId: string): Observable<any> {
    return this.http.get<any>(`${this.url}/${taskId}`);
  }
}
