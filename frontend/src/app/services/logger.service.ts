import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ILog } from 'interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
/**
 * Logger service.
 */
@Injectable()
export class LoggerService {
  private readonly url: string = `${API_BASE_URL}/logs`;
  constructor(
    private http: HttpClient
  ) {
  }

  public getLogs(logFindSettings?: any): Observable<any> {
    return this.http.post<any>(`${this.url}`, logFindSettings);
  }

  public getAttributes(name: string = ""): Observable<string[]> {
    return this.http.get<any>(`${this.url}/attributes`, { params: { name } });
  }
}
