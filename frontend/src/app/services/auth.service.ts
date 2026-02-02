import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ISession, IStandardRegistryResponse, IUser, UserCategory, UserRole } from '@guardian/interfaces';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { API_BASE_URL } from './api';
import { map } from 'rxjs/operators';

/**
 * Services for working from accounts.
 */
@Injectable()
export class AuthService {
    private accessTokenSubject: Subject<string | null>;
    private refreshTokenSubject: Subject<string | null>
    private readonly url: string = `${API_BASE_URL}/accounts`;

    constructor(
        private http: HttpClient
    ) {
        this.accessTokenSubject = new Subject();
        this.refreshTokenSubject = new Subject();
    }

    public login(username: string, password: string): Observable<any> {
        return this.http.post<string>(`${this.url}/login`, { username, password });
    }

    public changePassword(username: string, oldPassword: string, newPassword: string): Observable<any> {
        return this.http.post<string>(`${this.url}/change-password`, { username, oldPassword, newPassword });
    }

    public updateAccessToken(): Observable<any> {
        return this.http.post<any>(`${this.url}/access-token`, { refreshToken: this.getRefreshToken() }).pipe(
            map(result => {
                const { accessToken } = result;
                this.setAccessToken(accessToken);
                return accessToken
            })
        );
    }

    public createUser(username: string, password: string, confirmPassword: string, role: string): Observable<any> {
        return this.http.post<any>(`${this.url}/register`, {
            username, password, password_confirmation: confirmPassword, role
        })
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

    public setRefreshToken(refreshToken: string) {
        localStorage.setItem('refreshToken', refreshToken);
        this.refreshTokenSubject.next(refreshToken);
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

    public getRefreshToken() {
        return localStorage.getItem('refreshToken');
    }

    public subscribe(
        next?: ((accessToken: string | null) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.accessTokenSubject.subscribe(next, error, complete);
    }

    public getStandardRegistries(): Observable<IUser[]> {
        return this.http.get<any>(`${this.url}/standard-registries`);
    }

    public getAggregatedStandardRegistries(): Observable<IStandardRegistryResponse[]> {
        return this.http.get<any>(`${this.url}/standard-registries/aggregated`);
    }

    public balance(): Observable<any> {
        return this.http.get<any>(`${this.url}/balance`);
    }

    public home(role: UserRole | string | undefined): string {
        if (UserCategory.isStandardRegistry(role as UserRole)) {
            return '/config';
        } else if (UserCategory.isAudit(role as UserRole)) {
            return '/audit';
        } else if (UserCategory.isUser(role as UserRole)) {
            return '/user-profile';
        } else {
            return '/';
        }
    }
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (req.headers.has('Authorization')) {
            return next.handle(req);
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            return next.handle(req);
        }
        return next.handle(req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`),
        }));
    }
}
