import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommonSettings } from 'interfaces';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
/**
 * Services for working from user profile.
 */
@Injectable()
export class SettingsService {
  private readonly url: string = `${API_BASE_URL}/settings/`;
  constructor(
    private http: HttpClient
  ) {
  }
  public updateSettings(settings: CommonSettings): Observable<void> {
    return this.http.post<void>(`${this.url}`, settings);
  }

  public getSettings (): Observable<CommonSettings> {
    return this.http.get<CommonSettings>(`${this.url}`);
  }
}
