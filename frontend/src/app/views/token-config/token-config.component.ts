import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from "../../services/profile.service";
import { TokenService } from '../../services/token.service';
import { TokenDialog } from '../../components/token-dialog/token-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Token } from 'interfaces';

/**
 * Page for creating tokens.
 */
@Component({
    selector: 'app-token-config',
    templateUrl: './token-config.component.html',
    styleUrls: ['./token-config.component.css']
})
export class TokenConfigComponent implements OnInit {
    isConfirmed: boolean = false;
    displayedColumns: string[] = [
        'tokenId',
        'tokenName',
        'tokenSymbol',
        'users'
    ];
    tokens: Token[] = [];
    loading: boolean = true;
    tokenId: string = "";
    users: any[] = [];
    usersColumns: string[] = [
        'username',
        'associated',
        'tokenBalance',
        'frozen',
        'kyc',
        'refresh'
    ];

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog) {

    }

    ngOnInit() {
        this.tokenId = "";
        this.loading = true;
        this.route.queryParams.subscribe(queryParams => {
            this.loadProfile();
        });
    }

    queryChange() {
        const tokenId = this.route.snapshot.queryParams['tokenId'];
        if (tokenId) {
            this.tokenId = atob(tokenId);
        } else {
            this.tokenId = "";
        }
        if (this.tokenId) {
            this.auth.getUsers().subscribe((users) => {
                this.users = users;
                this.refreshAll(this.users);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        } else {
            this.tokenService.getTokens().subscribe((data) => {
                this.tokens = data.map(e => new Token(e));
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    loadProfile() {
        this.loading = true;
        this.profileService.getProfile().subscribe((profile) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            if (this.isConfirmed) {
                this.queryChange();
            } else {
                this.loading = false;
            }
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    newToken() {
        const dialogRef = this.dialog.open(TokenDialog, {
            width: '500px',
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.tokenService.create(result).subscribe((data) => {
                    this.tokens = data.map(e => new Token(e));
                    this.loading = false;
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    refreshUser(user: any, res: any) {
        user.refreshed = true;
        user.associated = "n/a";
        user.balance = "n/a";
        user.hBarBalance = "n/a";
        user.frozen = "n/a";
        user.kyc = "n/a";
        if (res) {
            user.associated = res.associated ? "Yes" : "No";
            if (res.associated) {
                user.balance = res.balance;
                user.hBarBalance = res.hBarBalance;
                user.frozen = res.frozen ? "Yes" : "No";
                user.kyc = res.kyc ? "Yes" : "No";
            }
        }
    }

    refresh(user: any) {
        user.loading = true;
        this.tokenService.info(this.tokenId, user.username).subscribe((res) => {
            this.refreshUser(user, res);
            user.loading = false;
        }, (e) => {
            console.error(e.error);
            user.loading = false;
        });
    }


    refreshAll(users: any[]) {
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            this.refresh(user);
        }
    }

    getColor(status: string, reverseLogic: boolean) {
        if (!status) return "na";
        if (status === "n/a") return "na";
        else if (status === "Yes") return reverseLogic ? "red" : "green";
        else return reverseLogic ? "green" : "red";
    }

    freeze(user: any, freeze: boolean) {
        this.loading = true;
        this.tokenService.freeze(this.tokenId, user.username, freeze).subscribe((res) => {
            this.refreshUser(user, res);
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    kyc(user: any, grantKYC: boolean) {
        this.loading = true;
        this.tokenService.kyc(this.tokenId, user.username, grantKYC).subscribe((res) => {
            this.refreshUser(user, res);
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
