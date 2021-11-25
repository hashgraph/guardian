import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { JsonDialog } from 'src/app/components/dialogs/vc-dialog/vc-dialog.component';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from "../../services/profile.service";
import { TokenService } from '../../services/token.service';
import { IUserProfile, ISession, Token, IToken, UserState } from 'interfaces';

interface IHederaForm {
    id: string,
    key: string,
}

/**
 * The page with the profile settings of a regular user.
 */
@Component({
    selector: 'app-installer-profile',
    templateUrl: './installer-profile.component.html',
    styleUrls: ['./installer-profile.component.css']
})
export class InstallerProfileComponent implements OnInit {
    isConfirmed: boolean = false;
    isNewAccount: boolean = false;
    profile: any = null;
    balance: string | null = null;
    tokens: Token[] | null = null;
    rootAuthorities: ISession[] = [];
    hederaForm = this.fb.group({
        id: ['', Validators.required],
        key: ['', Validators.required],
    });
    loading: boolean = true;

    displayedColumns: string[] = [
        'name',
        'associated',
        'hBarBalance',
        'tokenBalance',
        'frozen',
        'kyc'
    ];

    private interval: any;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private fb: FormBuilder,
        public dialog: MatDialog) {
    }

    ngOnInit() {
        this.loading = true;
        this.loadDate();
        this.update();
    }

    ngOnDestroy(): void {
        clearInterval(this.interval)
    }

    update() {
        this.interval = setInterval(() => {
            this.profileService.getCurrentState().subscribe(user => {
                if (!this.isConfirmed && !this.isNewAccount) {
                    this.loadDate();
                }
            })
        }, 10000);
    }

    loadDate() {
        this.balance = null;
        this.tokens = null;
        this.loading = true;
        forkJoin([
            this.profileService.getRootBalance(),
            this.profileService.getCurrentProfile(),
            this.tokenService.getUserTokens(),
            this.profileService.getRootAuthorities(),
        ]).subscribe((value) => {
            const balance: string | null = value[0];
            const profile: IUserProfile = value[1];
            const tokens: IToken[] = value[2];
            const rootAuthorities: ISession[] = value[3];

            this.balance = balance;
            this.tokens = tokens.map(e => new Token(e));
            this.rootAuthorities = rootAuthorities || [];

            if (profile) {
                this.isNewAccount = profile.state == UserState.CREATED;
                this.isConfirmed = (
                    profile.state != UserState.CREATED &&
                    profile.state != UserState.HEDERA_FILLED
                );
                this.formatJson(profile);
            }
            setTimeout(() => {
                this.loading = false;
            }, 200)
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    formatJson(profile: IUserProfile) {
        if (this.isConfirmed) {
            const didDocument = profile.didDocument ? profile.didDocument.document : "";
            const vcDocuments: any[] = profile.vcDocuments || [];
            this.profile = {
                hederaId: profile.hederaAccountId,
                did: profile.did,
                didDocument: JSON.stringify((didDocument), null, 4),
                vcDocuments: vcDocuments.map(e => JSON.stringify((e), null, 4))
            }
        }
    }

    onHederaSubmit() {
        if (this.hederaForm.valid) {
            this.createDID(this.hederaForm.value);
        }
    }

    createDID(data: IHederaForm) {
        this.loading = true;
        this.profileService.updateHederaProfile(data.id, data.key).subscribe(() => {
            this.loadDate();
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    randomKey() {
        this.loading = true;
        this.profileService.getRandomKey().subscribe((treasury) => {
            this.loading = false;
            this.hederaForm.setValue({
                id: treasury.id,
                key: treasury.key
            });
        }, (error) => {
            this.loading = false;
            this.hederaForm.setValue({
                id: '0.0.1548173',
                key: ''
            });
        });
    }

    getColor(status: string, reverseLogic: boolean) {
        if (status === "n/a") return "grey";
        else if (status === "Yes") return reverseLogic ? "red" : "green";
        else return reverseLogic ? "green" : "red";
    }

    associate(token: Token) {
        this.loading = true;
        this.tokenService.associate(token.tokenId, token.associated != "Yes").subscribe((treasury) => {
            this.loadDate()
        }, (error) => {
            this.loading = false;
        });
    }

    openDocument(document: any) {
        const dialogRef = this.dialog.open(JsonDialog, {
            width: '850px',
            data: {
                document: JSON.parse(document),
                title: "DID"
            }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }
}
