import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators, } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@guardian/interfaces';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { Subject, Subscription } from 'rxjs';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { QrCodeDialogComponent } from 'src/app/components/qr-code-dialog/qr-code-dialog.component';
import { MeecoVCSubmitDialogComponent } from 'src/app/components/meeco-vc-submit-dialog/meeco-vc-submit-dialog.component';
import { environment } from 'src/environments/environment';
import { takeUntil } from 'rxjs/operators';

/**
 * Login page.
 */
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();
    loading: boolean = false;
    errorMessage: string = '';
    passFieldType: 'password' | 'text' = 'password';
    loginForm = new FormGroup({
        login: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        password: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
    });
    initialMeecoBtnTitle: string = 'Meeco Login';
    meecoBtnTitle: string = this.initialMeecoBtnTitle;
    qrCodeDialogRef: MatDialogRef<QrCodeDialogComponent> | null = null;
    vcSubmitDialogRef: MatDialogRef<MeecoVCSubmitDialogComponent> | null = null;
    currentMeecoRequestId: string | null = null;
    private _subscriptions: Subscription[] = [];

    constructor(
        private authState: AuthStateService,
        private auth: AuthService,
        private router: Router,
        private wsService: WebSocketService,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        this.loading = false;
        this._subscriptions.push(
            this.authState.credentials.subscribe((credentials) =>
                this.setLogin(credentials.login, credentials.password)
            ),
            this.authState.login.subscribe((credentials) =>
                this.login(credentials.login, credentials.password)
            )
        );

        this.handleMeecoPresentVPMessage();
        this.handleMeecoVPVerification();
        this.handleMeecoVCApproval();
    }

    ngOnDestroy(): void {
        this._subscriptions.forEach((sub) => sub.unsubscribe());
        this.destroy$.next();
        this.destroy$.complete();
        this.qrCodeDialogRef = null;
        this.vcSubmitDialogRef = null;
    }

    onLogin() {
        this.errorMessage = '';
        if (this.loginForm.valid) {
            const d = this.loginForm.value;
            this.login(d.login, d.password);
        }
    }

    onMeecoLogin(): void {
        this.meecoBtnTitle = 'Generating QR code...';
        this.wsService.meecoLogin();
    }

    login(login: string, password: string) {
        this.loading = true;
        this.auth.login(login, password).subscribe(
            (result) => {
                this.auth.setRefreshToken(result.refreshToken);
                this.auth.setUsername(login);
                this.auth.updateAccessToken().subscribe(_result => {
                    this.authState.updateState(true);
                    if (result.role == UserRole.STANDARD_REGISTRY) {
                        this.router.navigate(['/config']);
                    } else {
                        this.router.navigate(['/']);
                    }
                })

            },
            ({ message }) => {
                this.loading = false;
                this.errorMessage = message;
            }
        );
    }

    setLogin(login: string, password: string) {
        this.loginForm.setValue({
            login: login,
            password: password,
        });
    }

    togglePasswordShow(): void {
        this.passFieldType =
            this.passFieldType === 'password' ? 'text' : 'password';
    }

    private handleMeecoPresentVPMessage(): void {
        this.wsService.meecoPresentVP$.pipe(takeUntil(this.destroy$)).subscribe((event) => {
            if (!this.qrCodeDialogRef) {
                this.qrCodeDialogRef = this.dialog.open(QrCodeDialogComponent, {
                    panelClass: 'g-dialog',
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        qrCodeData: event.redirectUri,
                    },
                });
            }

            this.qrCodeDialogRef.beforeClosed().subscribe(() => {
                this.qrCodeDialogRef = null;
                this.meecoBtnTitle = this.initialMeecoBtnTitle;
            });
        });
    }

    private handleMeecoVPVerification(): void {
        this.wsService.meecoVerifyVP$.pipe(takeUntil(this.destroy$)).subscribe((event) => {
            this.qrCodeDialogRef?.close();

            if (
                event.presentation_request_id !== this.currentMeecoRequestId &&
                !this.vcSubmitDialogRef
            ) {
                this.currentMeecoRequestId = event.presentation_request_id;
                this.vcSubmitDialogRef = this.dialog.open(
                    MeecoVCSubmitDialogComponent,
                    {
                        width: '750px',
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            document: event.vc,
                            presentationRequestId:
                                event.presentation_request_id,
                            submissionId: event.submission_id,
                            userRole: event.role,
                        },
                    }
                );

                this.vcSubmitDialogRef
                    .afterClosed()
                    .subscribe(() => (this.vcSubmitDialogRef = null));
            }
        });
    }

    private handleMeecoVCApproval(): void {
        this.wsService.meecoApproveVCSubscribe((event) => {
            this.vcSubmitDialogRef?.close();
            this.auth.setAccessToken(event.accessToken);
            this.auth.setUsername(event.username);
            this.authState.updateState(true);
            if (event.role == UserRole.STANDARD_REGISTRY) {
                this.router.navigate(['/config']);
            } else {
                this.router.navigate(['/']);
            }
        });
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

    get shouldDisableMeecoBtn(): boolean {
        return this.meecoBtnTitle !== this.initialMeecoBtnTitle;
    }

    get isMeecoLoginAllowed(): boolean {
        return environment.isMeecoConfigured;
    }
}
