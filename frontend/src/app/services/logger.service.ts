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
  private readonly url: string = `${API_BASE_URL}/logger`;
  constructor(
    private http: HttpClient
  ) {
  }

  public getLogs(logFindSettings?: any): Observable<ILog[]> {
    return this.http.post<ILog[]>(`${this.url}`, logFindSettings);
  }
}
