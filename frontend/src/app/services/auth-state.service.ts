import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthStateService {
    private readonly _value = new ReplaySubject<boolean>(1);
    private readonly _loginRequests = new Subject<{ login: string, password: string }>();
    private readonly _credentialRequests = new Subject<{ login: string, password: string }>();

    private refreshTokenTimer: any;

    constructor(
        private authService: AuthService
    ) {
        this.updateState(false, true);
        this._value.subscribe((isLogin) => {
            if (isLogin) {
                if (!this.refreshTokenTimer) {
                    this.refreshTokenTimer = setInterval(() => {
                        this.authService.updateAccessToken().subscribe();
                    }, environment.accessTokenUpdateInterval || 29 * 1000)
                }
            } else {
                clearInterval(this.refreshTokenTimer);
                this.refreshTokenTimer = null;
            }
        })
    }

    public get value(): Observable<boolean> {
        return this._value;
    }

    public get login(): Observable<{ login: string, password: string }> {
        return this._loginRequests;
    }

    public get credentials(): Observable<{ login: string, password: string }> {
        return this._credentialRequests;
    }

    public updateState(state: boolean, noClearLocalStorage = false): void {
        if (!noClearLocalStorage && !state) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
        this._value.next(state);
    }

    public doLogin(login: string, password: string): void {
        this._loginRequests.next({ login, password });
    }

    public setCredentials(login: string, password: string): void {
        this._credentialRequests.next({ login, password });
    }
}
