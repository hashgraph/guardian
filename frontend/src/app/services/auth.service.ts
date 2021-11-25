import {HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ISession, IUser} from 'interfaces';
import {Observable, of, Subject, Subscription} from 'rxjs';

/**
 * Services for working from accounts.
 */
@Injectable()
export class AuthService {
  private accessTokenSubject: Subject<string | null>;
  
  constructor(
    private http: HttpClient
  ) {
    this.accessTokenSubject = new Subject();
  }

  public login(username: string, password: string): Observable<any> {
    return this.http.post<string>('/api/account/login', {username, password});
  }

  public logout(): Observable<any> {
    return this.http.get<any>('/api/account/logout');
  }

  public getCurrentUser(force:boolean=false): Observable<ISession | null> {
    if (localStorage.getItem('accessToken')) {
      return this.http.get<any>(`/api/account/current-user?force=${{force}}`);
    } else {
      return of(null);
    }
  }

  public createUser(username: string, password: string, role: string): Observable<any> {
    return this.http.post<any>('/api/account/register', {username, password, role})
  }

  public getCurrentUsers(): Observable<IUser[]> {
    return this.http.get<any>('/api/account/get-all-users');
  }

  public setAccessToken(accessToken: string) {
    localStorage.setItem('accessToken', accessToken);
    this.accessTokenSubject.next(accessToken);
  }

  public removeAccessToken() {
    localStorage.removeItem('accessToken');
    this.accessTokenSubject.next(null);
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
