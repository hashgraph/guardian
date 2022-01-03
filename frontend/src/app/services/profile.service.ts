import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ISession, IUser, IUserProfile} from 'interfaces';
import {Observable} from 'rxjs';

/**
 * Services for working from user profile.
 */
@Injectable()
export class ProfileService {
  constructor(
    private http: HttpClient
  ) {
  }

  public getCurrentState(): Observable<ISession> {
    return this.http.get<any>('/api/profile/user-state');
  }

  public getCurrentProfile(): Observable<IUserProfile> {
    return this.http.get<any>('/api/profile/');
  }

  public updateHederaProfile(hederaAccountId: string, hederaAccountKey: string): Observable<IUserProfile> {
    return this.http.post<any>('/api/profile/set-hedera-profile', {hederaAccountId, hederaAccountKey});
  }

  public updateVCProfile(data: any): Observable<IUserProfile> {
    return this.http.post<any>('/api/profile/set-vc-profile', data);
  }

  public getRandomKey(): Observable<any> {
    return this.http.get<any>('/api/profile/random-key');
  }

  public getRootBalance(): Observable<string | null> {
    return this.http.get<string | null>('/api/profile/user-balance');
  }

  public getRootAuthorities(): Observable<IUser[]> {
    return this.http.get<IUser[]>('/api/profile/get-root-authority');
  }
}
