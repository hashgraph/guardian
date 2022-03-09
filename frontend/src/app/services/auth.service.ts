import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISession, IUser } from 'interfaces';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { API_BASE_URL } from './api';

/**
 * Services for working from accounts.
 */
@Injectable()
export class AuthService {
  private accessTokenSubject: Subject<string | null>;
  private readonly url: string = `${API_BASE_URL}/accounts`;

  constructor(
    private http: HttpClient
  ) {
    this.accessTokenSubject = new Subject();
  }

  public login(username: string, password: string): Observable<any> {
    return this.http.post<string>(`${this.url}/login`, { username, password });
  }

  public createUser(username: string, password: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.url}/register`, { username, password, role })
  }

  public sessions(): Observable<ISession | null> {
    if (!localStorage.getItem('accessToken')) {
      return of(null);
    }
    return this.http.get<ISession>(`${this.url}/session`);
  }

  public getUsers(): Observable<IUser[]> {
    return this.http.get<any[]>(`${this.url}/`);
  }

  public setAccessToken(accessToken: string) {
    localStorage.setItem('accessToken', accessToken);
    this.accessTokenSubject.next(accessToken);
  }

  public removeAccessToken() {
    localStorage.removeItem('accessToken');
    this.accessTokenSubject.next(null);
  }

  public setUsername(username: string) {
    localStorage.setItem('username', username);
  }

  public removeUsername() {
    localStorage.removeItem('username');
  }

  public getUsername(): string {
    return localStorage.getItem('username') as string;
  }

  public getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  public subscribe(
    next?: ((accessToken: string | null) => void),
    error?: ((error: any) => void),
    complete?: (() => void)
  ): Subscription {
    return this.accessTokenSubject.subscribe(next, error, complete);
  }
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return next.handle(req);
    }
    return next.handle(req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    }));
  }
}
