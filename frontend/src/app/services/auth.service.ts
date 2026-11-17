import { HttpClient, HttpContext, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { ISession, IStandardRegistryResponse, IUser, UserCategory, UserRole } from '@guardian/interfaces';
import { Observable, of, Subject, Subscription, throwError } from 'rxjs';
import { API_BASE_URL } from './api';
import { SILENT_HTTP_ERRORS, SKIP_AUTH_REFRESH } from '../constants';
import { catchError, finalize, map, shareReplay, switchMap, timeout } from 'rxjs/operators';

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

    public login(username: string, password: string, otp?: string): Observable<any> {
        return this.http.post<string>(`${this.url}/login`, { username, password, otp });
    }

    public changePassword(username: string, oldPassword: string, newPassword: string): Observable<any> {
        return this.http.post<string>(`${this.url}/change-password`, { username, oldPassword, newPassword });
    }

    public generateOtpSecret(): Observable<any> {
        return this.http.post<any>(`${this.url}/otp/generate`, {});
    }

    public confirmOtpSecret(token: string): Observable<any> {
        return this.http.post<any>(`${this.url}/otp/confirm`, { token });
    }

    public getOtpStatus(): Observable<any> {
        return this.http.get<any>(`${this.url}/otp/status`);
    }

    public deactivateOtp(): Observable<any> {
        return this.http.post<any>(`${this.url}/otp/deactivate`, {});
    }

    public updateAccessToken(): Observable<any> {
        return this.http.post<any>(
            `${this.url}/access-token`,
            { refreshToken: this.getRefreshToken() },
            {
                context: new HttpContext()
                    .set(SILENT_HTTP_ERRORS, true)
                    .set(SKIP_AUTH_REFRESH, true)
            }
        ).pipe(
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

    /**
     * The username carried by the access token, or null when there is no usable session.
     *
     * Read from the token rather than stored on its own, so it always names the account the requests
     * are made as. The token is not verified here: never use it as an access decision.
     */
    public getUsername(): string | null {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return null;
        }
        try {
            const payload = token.split('.')[1];
            if (!payload) {
                return null;
            }
            // base64url -> base64, then decode as UTF-8: atob alone mangles non-ASCII
            const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
            const bytes = Uint8Array.from(atob(normalized), (ch) => ch.charCodeAt(0));
            const decoded = JSON.parse(new TextDecoder().decode(bytes));
            return decoded?.username ? String(decoded.username) : null;
        } catch {
            return null;
        }
    }

    /**
     * The signed-in username, for requests addressed to the user's own resources. Throws when there is
     * no session, so such a request is never sent as `/null`.
     */
    public requireUsername(): string {
        const username = this.getUsername();
        if (!username) {
            throw new Error('There is no signed-in user');
        }
        return username;
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

/**
 * How long the requests that failed with 401 wait for the shared token refresh. The gateway gives
 * the auth service 30 s to answer it; past this the refresh counts as failed.
 */
export const REFRESH_TIMEOUT_MS = 40 * 1000;

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    // Shared in-flight refresh, so several requests failing with 401 at once
    // (e.g. after the access token lapses while the tab was asleep) trigger a
    // single token refresh instead of one per request.
    private refresh$: Observable<string> | null = null;

    // AuthService depends on HttpClient, so injecting it directly would create
    // a cyclic dependency with this interceptor; it is resolved lazily.
    constructor(private injector: Injector) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(this.addToken(req)).pipe(
            catchError((error: any) => {
                if (this.shouldAttemptRefresh(error, req)) {
                    return this.refreshAndRetry(req, next, error);
                }
                return throwError(() => error);
            })
        );
    }

    private addToken(req: HttpRequest<any>): HttpRequest<any> {
        if (req.headers.has('Authorization')) {
            return req;
        }
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return req;
        }
        return this.withBearer(req, token);
    }

    private withBearer(req: HttpRequest<any>, token: string): HttpRequest<any> {
        return req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`),
        });
    }

    /**
     * Recover a 401 by refreshing the access token — but only when there are
     * credentials to refresh with, and never for the refresh call itself (that
     * would loop). Requests without a stored session fall through to the error
     * interceptor unchanged.
     */
    private shouldAttemptRefresh(error: any, req: HttpRequest<any>): boolean {
        return (
            error?.status === 401 &&
            !req.context.get(SKIP_AUTH_REFRESH) &&
            !!localStorage.getItem('accessToken') &&
            !!localStorage.getItem('refreshToken')
        );
    }

    /**
     * A refresh that fails or never answers hands the request its original 401, which the error
     * interceptor turns into the end of the session and the login page, instead of leaving it pending.
     */
    private refreshAndRetry(req: HttpRequest<any>, next: HttpHandler, unauthorized: any): Observable<HttpEvent<any>> {
        return this.refreshToken().pipe(
            catchError(() => throwError(() => unauthorized)),
            switchMap((accessToken: string) => next.handle(this.withBearer(req, accessToken)))
        );
    }

    private refreshToken(): Observable<string> {
        if (!this.refresh$) {
            const auth = this.injector.get(AuthService);
            this.refresh$ = auth.updateAccessToken().pipe(
                timeout(REFRESH_TIMEOUT_MS),
                shareReplay(1),
                finalize(() => { this.refresh$ = null; })
            );
        }
        return this.refresh$;
    }
}
