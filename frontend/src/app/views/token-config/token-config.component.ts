import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from "../../services/profile.service";
import { TokenService } from '../../services/token.service';
import { TokenDialog } from '../../components/token-dialog/token-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Token } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

enum OperationMode {
    None, Create, Kyc
}

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
        'policies',
        'users',
    ];
    tokens: any[] = [];
    loading: boolean = true;
    tokenId: string = "";
    users: any[] = [];
    usersColumns: string[] = [
        'username',
        'associated',
        'tokenBalance',
        'frozen',
        'kyc',
        'refresh',
    ];

    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;
    operationMode: OperationMode = OperationMode.None;
    user: any;
    currentPolicy: any = '';
    policies: any[] | null = null;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private informService: InformService,
        private taskService: TasksService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog) {

    }

    ngOnInit() {
        this.tokenId = "";
        this.loading = true;
        this.currentPolicy = this.route.snapshot.queryParams['policy'];
        this.route.queryParams.subscribe(queryParams => {
            this.loadProfile();
        });
    }

    onFilter() {
        if (this.currentPolicy) {
            this.router.navigate(['/tokens'], {
                queryParams: {
                    policy: this.currentPolicy
                }
            });
        } else {
            this.router.navigate(['/tokens']);
        }
        this.loadTokens();
    }

    loadTokens() {
        this.tokenService.getTokens(this.currentPolicy).subscribe((data: any) => {
            this.tokens = data.map((e: any) => {
                return {
                    ...new Token(e),
                    policies: e.policies
                }
            });
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
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
            this.loadTokens();
        }
    }

    loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(),
        ]).subscribe((value) => {
            const profile = value[0];
            const policies = value[1] || [];
            this.isConfirmed = !!(profile && profile.confirmed);
            this.policies = policies;
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
            disableClose: true
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.tokenService.pushCreate(result).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                    this.operationMode = OperationMode.Create;
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
    }

    onAsyncCompleted() {
        if (this.taskId) {
            const taskId = this.taskId;
            const operationMode = this.operationMode;
            this.taskId = undefined;
            this.operationMode = OperationMode.None;
            switch (operationMode) {
                case OperationMode.Create:
                    this.loadTokens();
                    break;
                case OperationMode.Kyc:
                    this.taskService.get(taskId).subscribe((task) => {
                        this.loading = false;
                        const { result } = task;
                        this.refreshUser(this.user, result);
                        this.user = null;
                    });
                    break;
                default:
                    console.log('Unsupported operation mode');
            }
        }
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
        this.tokenService.pushKyc(this.tokenId, user.username, grantKYC).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.Kyc;
            this.user = user;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    getPoliciesInfo(policies: string[]): string {
        if (!policies || !policies.length) {
            return "";
        }
        return policies.length === 1
            ? policies[0]
            : `Used in ${policies.length} policies`;
    }
}
