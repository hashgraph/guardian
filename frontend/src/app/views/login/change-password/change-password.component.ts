import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

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
    public changeForm = new UntypedFormGroup({
        login: new UntypedFormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        oldPassword: new UntypedFormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        newPassword: new UntypedFormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        confirmPassword: new UntypedFormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
    });
    public wrongNameOrPassword: boolean = false;
    public wrongMatchPassword: boolean = false;
    public login: string;
    public message: string;

    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private auth: AuthService,
        private router: Router,
        private authState: AuthStateService
    ) {
        this.login = this.dialogConfig.data?.login;
        this.message = this.dialogConfig.data?.message;
    }

    ngOnInit() {
        this.changeForm.controls.login.setValue(this.login);
    }

    onNoClick() {
        this.dialogRef.close(false);
    }

    onChange() {
        this.wrongNameOrPassword = false;
        this.wrongMatchPassword = false;
        const value = this.changeForm.value;
        if (this.changeForm.invalid) {
            this.wrongNameOrPassword = true;
            return;
        }
        if (value.newPassword !== value.confirmPassword) {
            this.wrongMatchPassword = true;
            return;
        }

        this.loading = true;
        this.auth.changePassword(value.login, value.oldPassword, value.newPassword)
            .subscribe((result) => {
                this.auth.setRefreshToken(result.refreshToken);
                this.auth.setUsername(value.login);
                this.auth.updateAccessToken().subscribe(_result => {
                    this.authState.updateState(true);
                    const home = this.auth.home(result.role);
                    this.router.navigate([home]);
                    this.dialogRef.close(true);
                });
            }, (error) => {
                setTimeout(() => {
                    this.loading = false;
                    if (String(error.status) === '401') {
                        this.wrongNameOrPassword = true;
                    }
                }, 500);
            });
    }
}