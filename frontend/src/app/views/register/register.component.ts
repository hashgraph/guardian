import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { UserRole } from 'interfaces';
import { Observable, ReplaySubject } from 'rxjs';

const checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    let pass = group.get('password');
    let confirmPass = group.get('confirmPassword');
    return (
        pass && confirmPass &&
        pass.value === confirmPass.value
    ) ? null : { notSame: true };
}

/**
 * Registration page.
 */
@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
    loading: boolean = false;
    error?: string;

    loginForm = this.fb.group({
        login: [Math.random().toString(36).substring(2,10), Validators.required],
        role: ['USER', Validators.required],
        password: ['test', Validators.required],
        confirmPassword: ['test', Validators.required],
    }, { validators: checkPasswords });

    private _isRoleSelected$ = new ReplaySubject<boolean>(1);

    constructor(
        private auth: AuthService,
        private authState: AuthStateService,
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router) {
        this._isRoleSelected$.next(false);
    }

    public get isRoleSelected$(): Observable<boolean> {
        return this._isRoleSelected$;
    }

    ngOnInit() {
        this.loading = false;
    }

    signup() {
        if (this.loginForm.valid) {
            const d = this.loginForm.value;
            this.loading = true;
            this.auth.createUser(d.login, d.password, d.role).subscribe((result) => {
                if(result.error) {
                    this.error = result.error;
                    this.loading = false;
                    return;
                }
                this.auth.login(d.login, d.password).subscribe((result) => {
                    this.loading = false;
                    this.auth.setAccessToken(result.accessToken);
                    this.authState.updateState(true);
                    if (result.role == UserRole.ROOT_AUTHORITY) {
                        this.router.navigate(['/config']);
                    } else {
                        this.router.navigate(['/']);
                    }
                }, (error) => {
                    this.loading = false;
                })
            }, (error) => {
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
}