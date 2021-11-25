import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ISession, IToken} from 'interfaces';
import {Observable} from 'rxjs';

/**
 * Services for working from Tokens.
 */
@Injectable()
export class TokenService {
  constructor(
    private http: HttpClient
  ) {
  }

  public createToken(data: any): Observable<IToken[]> {
    return this.http.post<IToken[]>('/api/tokens/create', data);
  }

  public getTokens(): Observable<IToken[]> {
    return this.http.get<IToken[]>('/api/tokens');
  }

  public getUserTokens(): Observable<IToken[]> {
    return this.http.get<IToken[]>('/api/tokens/user-tokens');
  }

  public associate(tokenId: string, associated: boolean): Observable<IToken> {
    return this.http.post<IToken>('/api/tokens/associate', {tokenId, associated});
  }

  public getAssociatedUsers(tokenId: string, username: string): Observable<any> {
    return this.http.get<any[]>(`/api/tokens/associate-users?tokenId=${tokenId}&username=${username}`);
  }

  public getUsers(): Observable<ISession[]> {
    return this.http.get<any[]>(`/api/tokens/all-users`);
  }

  public grantKYC(tokenId: string, username: any, grantKYC: boolean) {
    return this.http.post<any>(`/api/tokens/user-kyc`, {tokenId, username, value: grantKYC});
  }

  public getFreezeUser(tokenId: string, username: any, freeze: boolean) {
    return this.http.post<any>(`/api/tokens/user-freeze`, {tokenId, username, value: freeze});
  }
}