import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from "../../services/profile.service";
import { TokenService } from '../../services/token.service';
import { IUser, Token, IToken } from 'interfaces';
import { DemoService } from 'src/app/services/demo.service';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';

interface IHederaForm {
    id: string,
    key: string,
}

/**
 * The page with the profile settings of a regular user.
 */
@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
    loading: boolean = true;
    isConfirmed: boolean = false;
    isFailed: boolean = false;
    isNewAccount: boolean = false;
    profile?: IUser | null;
    balance?: string | null;
    tokens?: Token[] | null;
    didDocument?:string;

    hederaForm = this.fb.group({
        id: ['', Validators.required],
        key: ['', Validators.required],
    });


    displayedColumns: string[] = [
        'name',
        'associated',
        'tokenBalance',
        'frozen',
        'kyc'
    ];

    private interval: any;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private otherService: DemoService,
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
            if (!this.isConfirmed && !this.isNewAccount) {
                this.loadDate();
            }
        }, 15000);
    }

    loadDate() {
        this.balance = null;
        this.tokens = null;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.profileService.getBalance(),
            this.tokenService.getTokens()
        ]).subscribe((value) => {
            this.profile = value[0] as IUser;
            this.balance = value[1] as string;
            this.tokens = value[2].map(e => new Token(e));

            this.isConfirmed = !!this.profile.confirmed;
            this.isFailed = !!this.profile.failed;
            this.isNewAccount = !this.profile.didDocument;
            
            this.didDocument= "";
            if(this.isConfirmed) {
                const didDocument = this.profile?.didDocument?.document;
                if(didDocument) {
                    this.didDocument= JSON.stringify((didDocument), null, 4);
                }
            }

            setTimeout(() => {
                this.loading = false;
            }, 200)
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    onHederaSubmit() {
        if (this.hederaForm.valid) {
            this.createDID(this.hederaForm.value);
        }
    }

    createDID(data: IHederaForm) {
        this.loading = true;
        const profile = {
            hederaAccountId: data.id,
            hederaAccountKey: data.key,
        }
        this.profileService.setProfile(profile).subscribe(() => {
            this.loadDate();
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    randomKey() {
        this.loading = true;
        this.otherService.getRandomKey().subscribe((treasury) => {
            this.loading = false;
            this.hederaForm.setValue({
                id: treasury.id,
                key: treasury.key
            });
        }, (error) => {
            this.loading = false;
            this.hederaForm.setValue({
                id: '',
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
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: JSON.parse(document),
                title: "DID",
                type: 'JSON',
            }

        });

        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }

    retry() {
        this.isConfirmed = false;
        this.isFailed = false;
        this.isNewAccount = true;
        clearInterval(this.interval)
    }
}
