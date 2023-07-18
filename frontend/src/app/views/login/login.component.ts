import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@guardian/interfaces';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { Subscription } from 'rxjs';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { QrCodeDialogComponent } from 'src/app/components/qr-code-dialog/qr-code-dialog.component';
import { MeecoVCSubmitDialogComponent } from 'src/app/components/meeco-vc-submit-dialog/meeco-vc-submit-dialog.component';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';

/**
 * Login page.
 */
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
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
    meecoBtnTitle: string = 'Meeco Login';
    qrCodeDialogRef: MatDialogRef<QrCodeDialogComponent>;
    private _subscriptions: Subscription[] = [];

    constructor(
        private authState: AuthStateService,
        private auth: AuthService,
        private router: Router,
        private wsService: WebSocketService,
        private dialog: MatDialog,
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
    }

    ngOnDestroy(): void {
        this._subscriptions.forEach((sub) => sub.unsubscribe());
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
        // this.dialog.open(VCViewerDialog, {
        //     width: '800px',
        //     disableClose: true,
        //     autoFocus: false,
        //     data: {
        //         viewDocument: true,
        //         type: 'VC',
        //         title: 'VC Subject Submission',
        //         document: {
        //             // exp: 1703977200,
        //             // iat: 1689763146,
        //             // iss: "did:web:did-web.securevalue.exchange:343b08f3-dc4d-4cd3-b276-3f2d8a146a0d",
        //             // nbf: 1689763146,
        //             // sub: "did:key:z6Mks8LiXzcq9rpfMMY5SHCtT6mXaBpyimEL4i32whrfJKHx",
        //                 '@context': ['https://www.w3.org/2018/credentials/v1'],
        //                 credentialSchema: {
        //                     id: 'https://api-sandbox.svx.exchange/schemas/5a9ea82e-e80b-4cb1-8e6f-0b10727b762b/1.0.0/schema.json',
        //                     type: 'JsonSchemaValidator2018'
        //                 },
        //                 credentialSubject: {
        //                     id: 'did:key:z6Mks8LiXzcq9rpfMMY5SHCtT6mXaBpyimEL4i32whrfJKHx',
        //                     familyName: 'Iryna',
        //                     firstName: 'Telesheva',
        //                     dateOfBirth: '2000-07-03',
        //                     personalIdentifier: 'iryna.telesheva@intellecteu.com',
        //                     gender: "Female",
        //                     currentAddress: "",
        //                     nameAndFamilyNameAtBirth: "",
        //                     placeOfBirth: "",
        //                 },
        //                 expirationDate: "2023-12-30T23:00:00Z",
        //                 id: "urn:uuid:e7bddaf6-b4a2-4d48-b277-64d87b2f1dc8",
        //                 issuanceDate: "2023-07-19T10:39:06Z",
        //                 issuer: {
        //                     id: 'did:web:did-web.securevalue.exchange:343b08f3-dc4d-4cd3-b276-3f2d8a146a0d',
        //                     name: 'ieu'
        //                 },
        //                 type: ['VerifiableCredential'],
        //         },
        //     },
        // });
        // this.dialog.open(MeecoVCSubmitDialogComponent, {
        //     width: '800px',
        //     disableClose: true,
        //     autoFocus: false,
        //     data: {
        //         document: [
        //             {
        //                 geography: 'Ukraine',
        //                 law: 'test',
        //                 tags: 'test',
        //                 '@context': [
        //                     'ipfs://bafkreiam7a2vox6q7yweh4xsebpp4vnonasxlzcdsaxt2cicviax4f7ruq'
        //                 ],
        //                 id: 'did:hedera:testnet:DBWr1G27LMy2RbhEBmY4GD235kiaaTpKGqaYBWQbAYe5_0.0.15432355',
        //                 type: 'StandardRegistry'
        //             }
        //         ],
        //     },
        // });
    }

    login(login: string, password: string) {
        this.loading = true;
        this.auth.login(login, password).subscribe(
            (result) => {
                this.auth.setAccessToken(result.accessToken);
                this.auth.setUsername(login);
                this.authState.updateState(true);
                if (result.role == UserRole.STANDARD_REGISTRY) {
                    this.router.navigate(['/config']);
                } else {
                    this.router.navigate(['/']);
                }
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
        this.wsService.meecoPresentVPSubscribe((event) => {
            this.qrCodeDialogRef = this.dialog.open(QrCodeDialogComponent, {
                panelClass: 'g-dialog',
                disableClose: true,
                autoFocus: false,
                data: {
                    qrCodeData: event.redirectUri,
                },
            });
            this.qrCodeDialogRef
                .afterClosed()
                .subscribe(() => (this.meecoBtnTitle = 'Meeco Login'));
        });
    }

    private handleMeecoVPVerification(): void {
        this.wsService.meecoVerifyVPSubscribe((event) => {
            // ToDo: remove
            console.log(event);
            this.qrCodeDialogRef.close();
            this.dialog.open(MeecoVCSubmitDialogComponent, {
                width: '800px',
                disableClose: true,
                autoFocus: false,
                data: { document: event.vc },
            });
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
}
