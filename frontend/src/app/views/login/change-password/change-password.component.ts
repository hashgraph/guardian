import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';

/**
 * Registration page.
 */
@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
    public loading: boolean = false;
    public changeForm = new FormGroup({
        login: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        oldPassword: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        newPassword: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        confirmPassword: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
    });
    public wrongNameOrPassword: boolean = false;
    public errorMessage: string = '';

    constructor(
        private auth: AuthService,
        private router: Router,
        private authState: AuthStateService
    ) {

    }

    ngOnInit() {
    }

    onChange() {
        this.errorMessage = '';
        const value = this.changeForm.value;
        if (this.changeForm.invalid) {
            this.errorMessage = '';
            return;
        }
        if (value.newPassword !== value.confirmPassword) {
            this.errorMessage = '';
            return;
        }

        this.loading = true;
        this.wrongNameOrPassword = false;
        this.auth.changePassword(value.login, value.oldPassword, value.newPassword)
            .subscribe((result) => {
                this.auth.setRefreshToken(result.refreshToken);
                this.auth.setUsername(value.login);
                this.auth.updateAccessToken().subscribe(_result => {
                    this.authState.updateState(true);
                    const home = this.auth.home(result.role);
                    this.router.navigate([home]);
                });
            }, (error) => {
                this.loading = false;
                this.errorMessage = error.message;
                if (String(error.status) === '401') {
                    if (error.error.message === 'UNSUPPORTED_PASSWORD_TYPE') {
                        this.router.navigate(['/change-password']);
                    } else {
                        this.wrongNameOrPassword = true;
                    }
                }
            });
    }
}