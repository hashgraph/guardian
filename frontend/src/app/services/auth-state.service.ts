import { Injectable } from "@angular/core";
import { Observable, ReplaySubject, Subject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AuthStateService {
    private readonly _value = new ReplaySubject<boolean>(1);
    private readonly _loginRequests = new Subject<{login: string, password: string}>();
    private readonly _credentialRequests = new Subject<{login: string, password: string}>();

    constructor() {
        this.updateState(false);
    }

    public get value(): Observable<boolean> {
        return this._value;
    }

    public get login(): Observable<{login: string, password: string}> {
        return this._loginRequests;
    }

    public get credentials(): Observable<{login: string, password: string}> {
        return this._credentialRequests;
    }

    public updateState(state: boolean): void {
        this._value.next(state);
    }

    public doLogin(login: string, password: string): void {
        this._loginRequests.next({login, password});
    }

    public setCredentials(login: string, password: string): void {
        this._credentialRequests.next({login, password});
    }
}