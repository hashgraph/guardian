import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@guardian/interfaces';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { Subscription } from 'rxjs';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { environment } from 'src/environments/environment';

/**
 * Login page.
 */
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
    loading: boolean = false;
    errorMessage: string = "";
    passFieldType: 'password' | 'text' = 'password';
    production: boolean = environment.production;

    loginForm = new FormGroup({
        login: new FormControl('', [Validators.required, noWhitespaceValidator()]),
        password: new FormControl('', [Validators.required, noWhitespaceValidator()]),
    });

    private _subscriptions: Subscription[] = [];

    constructor(
        private authState: AuthStateService,
        private auth: AuthService,
        private router: Router) {}

    ngOnInit() {
        this.loading = false;
        this._subscriptions.push(
            this.authState.credentials
                .subscribe((credentials) => this.setLogin(credentials.login, credentials.password)),
            this.authState.login
                .subscribe((credentials) => this.login(credentials.login, credentials.password))
        );
    }

    ngOnDestroy(): void {
        this._subscriptions.forEach((sub) => sub.unsubscribe());
    }

    onLogin() {
        this.errorMessage = "";
        if (this.loginForm.valid) {
            const d = this.loginForm.value;
            this.login(d.login, d.password);
        }
    }

    login(login: string, password: string) {
        this.loading = true;
        this.auth.login(login, password).subscribe((result) => {
            this.auth.setAccessToken(result.accessToken);
            this.auth.setUsername(login);
            this.authState.updateState(true);
            if (result.role == UserRole.STANDARD_REGISTRY) {
                this.router.navigate(['/config']);
            } else {
                this.router.navigate(['/']);
            }
        }, ({ message }) => {
            this.loading = false;
            this.errorMessage = message;
        })
    }

    setLogin(login: string, password: string) {
        this.loginForm.setValue({
            login: login,
            password: password,
        })
    }

    togglePasswordShow(): void {
        this.passFieldType = this.passFieldType === 'password' ? 'text': 'password';
    }

    private get loginControl(): AbstractControl {
        return this.loginForm.get('login') as AbstractControl;
    }

    private get passwordControl(): AbstractControl {
        return this.loginForm.get('password') as AbstractControl;
    }

    private get loginErrors(): ValidationErrors {
        return this.loginControl.errors || {};
    }

    private get passwordErrors(): ValidationErrors {
        return this.passwordControl.errors || {};
    }

    get showLoginRequiredError(): boolean {
        return (
            this.loginControl.touched &&
            (this.loginErrors.required || this.loginErrors.whitespace)
        );
    }

    get showPasswordRequiredError(): boolean {
        return (
            this.passwordControl.touched &&
            (this.passwordErrors.required || this.passwordErrors.whitespace)
        );
    }

    get showPasswordValue(): boolean {
        return this.passFieldType === 'text';
    }
}
