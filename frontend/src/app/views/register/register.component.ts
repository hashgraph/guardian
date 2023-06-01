import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Validators, ValidatorFn, AbstractControl, ValidationErrors, FormGroup, FormControl } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { UserRole } from '@guardian/interfaces';
import { Observable, ReplaySubject } from 'rxjs';
import { noWhitespaceValidator } from 'src/app/validators/no-spaces.validator';

const checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    let pass = group.get('password');
    let confirmPass = group.get('confirmPassword');
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
        login: new FormControl(Math.random().toString(36).substring(2,10), [Validators.required, noWhitespaceValidator()]),
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
                if(result.error) {
                    this.error = result.error;
                    this.loading = false;
                    return;
                }
                this.auth.login(d.login, d.password).subscribe((result) => {
                    this.auth.setAccessToken(result.accessToken);
                    this.auth.setUsername(d.login);
                    this.authState.updateState(true);
                    if (result.role === UserRole.STANDARD_REGISTRY) {
                        this.router.navigate(['/config']);
                    } else {
                        this.router.navigate(['/']);
                    }
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
        this.loginForm.patchValue({role});
        this._isRoleSelected$.next(!!role);
    }

    goBack(): void {
        this.router.navigate(['/login']);
    }

    onInput() {
        this.error = "";
    }

    togglePasswordShow(): void {
        this.passFieldType = this.passFieldType === 'password' ? 'text': 'password';
    }

    toggleConfirmPasswordShow(): void {
        this.confirmPassFieldType = this.confirmPassFieldType === 'password' ? 'text': 'password';
    }

    private get usernameControl(): AbstractControl {
        return this.loginForm.get('login') as AbstractControl;
    }

    private get passwordControl(): AbstractControl {
        return this.loginForm.get('password') as AbstractControl;
    }

    private get usernameErrors(): ValidationErrors {
        return this.usernameControl.errors || {};
    }

    private get passwordErrors(): ValidationErrors {
        return this.passwordControl.errors || {};
    }

    get showUsernameRequiredError(): boolean {
        return (
            this.usernameControl.touched &&
            (this.usernameErrors.required || this.usernameErrors.whitespace)
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
