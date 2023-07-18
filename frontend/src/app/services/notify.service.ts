import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable()
export class NotifyService {
  private readonly url: string = `${API_BASE_URL}/notify`;

  constructor(private http: HttpClient) {
  }

  public get(): Observable<any> {
    return this.http.get<any>(`${this.url}`);
  }

  public progresses(): Observable<any> {
    return this.http.get<any>(`${this.url}/progress`);
  }

  public readAll(): Observable<any> {
    return this.http.get<any>(`${this.url}/read/all`);
  }
}
