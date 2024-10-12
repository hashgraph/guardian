import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { UserCategory, UserRole } from '@guardian/interfaces';
import { Observable, ReplaySubject } from 'rxjs';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';

const checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const pass = group.get('password');
    const confirmPass = group.get('confirmPassword');
    return (
        pass && confirmPass &&
        pass.value === confirmPass.value
    ) ? null : { passwordsMismatch: true };
}

/**
 * Registration page.
 */
@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
    loading: boolean = false;
    error?: string;

    loginForm = new FormGroup({
        login: new FormControl(Math.random().toString(36).substring(2, 10), [Validators.required, noWhitespaceValidator()]),
        role: new FormControl('USER', [Validators.required]),
        password: new FormControl('test', [Validators.required, noWhitespaceValidator()]),
        confirmPassword: new FormControl('test', [Validators.required, noWhitespaceValidator()]),
    }, { validators: checkPasswords });

    private _isRoleSelected$ = new ReplaySubject<boolean>(1);
    passFieldType: 'password' | 'text' = 'text';
    confirmPassFieldType: 'password' | 'text' = 'text';

    constructor(
        private auth: AuthService,
        private authState: AuthStateService,
        private router: Router) {
        this._isRoleSelected$.next(false);
    }

    ngOnInit() {
        this.loading = false;
    }

    signup() {
        if (this.loginForm.valid) {
            const d = this.loginForm.value;
            this.loading = true;
            this.auth.createUser(d.login, d.password, d.confirmPassword, d.role).subscribe((result) => {
                if (result.error) {
                    this.error = result.error;
                    this.loading = false;
                    return;
                }
                this.auth.login(d.login, d.password).subscribe((result) => {
                    this.auth.setRefreshToken(result.refreshToken);
                    this.auth.updateAccessToken().subscribe((_result) => {
                        this.auth.setAccessToken(_result);
                        this.auth.setUsername(d.login);
                        this.authState.updateState(true);
                        const home = this.auth.home(result.role);
                        this.router.navigate([home]);
                    }, () => {
                        this.loading = false;
                    })
                }, () => {
                    this.loading = false;
                })
            }, ({ error }) => {
                this.error = error.message;
                this.loading = false;
            })
        }
    }

    setRole(role: string): void {
        this.loginForm.patchValue({ role });
        this._isRoleSelected$.next(!!role);
    }

    goBack(): void {
        this.router.navigate(['/login']);
    }

    onInput() {
        this.error = "";
    }

    togglePasswordShow(): void {
        this.passFieldType = this.passFieldType === 'password' ? 'text' : 'password';
    }

    toggleConfirmPasswordShow(): void {
        this.confirmPassFieldType = this.confirmPassFieldType === 'password' ? 'text' : 'password';
    }

    shouldShowRequiredError(controlName: string): boolean {
        const errors = this.getControlErrors(controlName);
        const control = this.loginForm.get(controlName);

        return control?.touched && (errors.required || errors.whitespace);
    }

    private getControlErrors(control: string): ValidationErrors {
        return this.loginForm.get(control)?.errors || {};
    }

    get showPassMismatchError(): boolean {
        return !this.shouldShowRequiredError('confirmPassword') && this.formErrors?.passwordsMismatch;
    }

    get showPasswordValue(): boolean {
        return this.passFieldType === 'text';
    }

    get showConfirmPasswordValue(): boolean {
        return this.confirmPassFieldType === 'text';
    }

    get formErrors(): ValidationErrors | null {
        return this.loginForm.errors;
    }

    get isRoleSelected$(): Observable<boolean> {
        return this._isRoleSelected$;
    }
}
