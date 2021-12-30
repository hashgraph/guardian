import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ISession } from 'interfaces';
import { API_BASE_URL } from './api';

/**
 * Services for working from demo.
 */
@Injectable()
export class DemoService {
  private readonly url: string = `${API_BASE_URL}/demo`;
  constructor(
    private http: HttpClient
  ) {
  }

  public getRandomKey(): Observable<any> {
    return this.http.get<any>(`${this.url}/randomKey`);
  }

  public getAllUsers(): Observable<ISession[]> {
    return this.http.get<any>(`${this.url}/registeredUsers`);
  }
}
