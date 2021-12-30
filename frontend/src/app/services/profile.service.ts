import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IUser } from 'interfaces';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api';
/**
 * Services for working from user profile.
 */
@Injectable()
export class ProfileService {
  private readonly url: string = `${API_BASE_URL}/profile`;
  constructor(
    private http: HttpClient
  ) {
  }

  public getProfile(): Observable<IUser> {
    return this.http.get<any>(`${this.url}`);
  }

  public setProfile(profile: IUser): Observable<void> {
    return this.http.put<void>(`${this.url}`, profile);
  }

  public getBalance(): Observable<string | null> {
    return this.http.get<string | null>(`${this.url}/balance`);
  }
}
