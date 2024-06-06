import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators, } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserCategory, UserRole } from '@guardian/interfaces';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { Observable, Subject, Subscription } from 'rxjs';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { QrCodeDialogComponent } from 'src/app/components/qr-code-dialog/qr-code-dialog.component';
import { MeecoVCSubmitDialogComponent } from 'src/app/components/meeco-vc-submit-dialog/meeco-vc-submit-dialog.component';
import { environment } from 'src/environments/environment';
import { takeUntil } from 'rxjs/operators';
import { BrandingService } from '../../services/branding.service';
import { DialogService } from 'primeng/dynamicdialog';
import { AccountTypeSelectorDialogComponent } from './register-dialogs/account-type-selector-dialog/account-type-selector-dialog.component';
import { ForgotPasswordDialogComponent } from './forgot-password-dialog/forgot-password-dialog.component';
import { RegisterDialogComponent } from './register-dialogs/register-dialog/register-dialog.component';
import { DemoService } from '../../services/demo.service';

/**
 * Login page.
 */
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
    testUsers$: Observable<any[]>;
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

    backgroundImageData: string;
    companyName: string;
    brandingLoading: boolean = true;
    error?: string;

    isMgsMode: boolean = true;
    wrongNameOrPassword: boolean = false;

    constructor(
        public authState: AuthStateService,
        public otherService: DemoService,
        private auth: AuthService,
        private router: Router,
        private wsService: WebSocketService,
        private dialog: MatDialog,
        private brandingService: BrandingService,
        private dialogService: DialogService,
    ) {
    }

    ngOnInit() {
        this.testUsers$ = this.otherService.getAllUsers();
        this.loading = false;
        this.redirect().finally(() => {
            this._subscriptions.push(
                this.authState.credentials.subscribe((credentials) =>
                    this.setLogin(credentials.login, credentials.password)
                ),
                this.authState.login.subscribe((credentials) =>
                    this.login(credentials.login, credentials.password)
                ),
            );

            this.brandingService.getBrandingData().then((res) => {
                this.backgroundImageData = res.loginBannerUrl;
                this.companyName = res.companyName;
                this.brandingLoading = false;
            });

            this.handleMeecoPresentVPMessage();
            this.handleMeecoVPVerification();
            this.handleMeecoVCApproval();
        });

        this.loginForm.valueChanges.subscribe(() => {
            this.wrongNameOrPassword = false;
        })
    }

    getPoliciesRolesTooltip(policyRoles: any) {
        return policyRoles.map((item: any) => {
            return `${item.name} (${item.version}): ${item.role}`
        }).join('\r\n');
    }

    async redirect() {
        this.auth.sessions().subscribe((user: any | null) => {
            if (user) {
                const home = this.auth.home(user.role);
                this.router.navigate([home]);
            }
        });
    }

    ngOnDestroy(): void {
        this._subscriptions.forEach((sub) => sub.unsubscribe());
        this.destroy$.next();
        this.destroy$.complete();
        this.qrCodeDialogRef = null;
        this.vcSubmitDialogRef = null;
    }

    onLogin() {
        this.loading = true;
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
                    const home = this.auth.home(result.role);
                    this.router.navigate([home]);
                });
            },
            ({ message }) => {
                this.loading = false;
                this.errorMessage = message;
                if (this.errorMessage.includes('401')) {
                    this.wrongNameOrPassword = true;
                }
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
            const home = this.auth.home(event.role);
            this.router.navigate([home]);
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

    signUpInit() {
        const registerAccount = (userRole: UserRole, userData: any) => {
            this.brandingLoading = true;
            this.auth.createUser(userData.username, userData.password, userData.confirmPassword, userRole).subscribe((result) => {
                if (result.error) {
                    this.error = result.error;
                    this.brandingLoading = false;

                    return;
                }
                this.login(userData.username, userData.password);
            }, ({ error }) => {
                this.error = error.message;
                this.loading = false;
                this.brandingLoading = false;
            })
        }

        const part3 = (userRole: UserRole) => {
            this.dialogService.open(RegisterDialogComponent, {
                header: 'Sign Up Request',
                width: '640px',
                modal: true,
            }).onClose.subscribe((userData) => {
                if (userData) {
                    registerAccount(userRole, userData);
                }
            })
        }

        const part2 = () => {
            this.dialogService.open(AccountTypeSelectorDialogComponent, {
                header: 'Select Account Type',
                width: '640px',
                modal: true,
            }).onClose.subscribe((userRole) => {
                if (userRole) {
                    part3(userRole);
                }
            })
        }

        if (this.isMgsMode) {
            part2();
        } else {
            part3(UserRole.USER)
        }
    }

    forgotPasswordInit() {
        this.dialogService.open(ForgotPasswordDialogComponent, {
            header: 'Request Password Reset',
            width: '640px',
            modal: true,
            data: {
                login: this.loginControl.value,
            }
        }).onClose.subscribe((data) => {
            if (data) {
                console.log(data);
            }
        });
    }
}
