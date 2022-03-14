import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IUser } from 'interfaces';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api';
import {AuthService} from './auth.service';
/**
 * Services for working from user profile.
 */
@Injectable()
export class ProfileService {
  private readonly url: string = `${API_BASE_URL}/profiles/`;
  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {
  }

  public getProfile(): Observable<IUser> {
    return this.http.get<any>(`${this.url}${encodeURIComponent(this.auth.getUsername())}`);
  }

  public setProfile(profile: IUser): Observable<void> {
    return this.http.put<void>(`${this.url}${encodeURIComponent(this.auth.getUsername())}`, profile);
  }

  public getBalance(): Observable<string | null> {
    return this.http.get<string | null>(`${this.url}${encodeURIComponent(this.auth.getUsername())}/balance`);
  }
}
