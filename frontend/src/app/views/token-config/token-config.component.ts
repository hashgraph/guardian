import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from "../../services/profile.service";
import { TokenService } from '../../services/token.service';
import { TokenDialog } from '../../modules/common/token-dialog/token-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaHelper, TagType, Token } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { TagsService } from 'src/app/services/tag.service';

enum OperationMode {
    None, Create, Kyc, Freeze
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
        'tags',
        'users',
        'edit',
        'delete'
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
        'refresh'
    ];

    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;
    operationMode: OperationMode = OperationMode.None;
    user: any;
    currentPolicy: any = '';
    policies: any[] | null = null;
    tagEntity = TagType.Token;
    owner: any;
    tagSchemas: any[] = [];

    public innerWidth: any;
    public innerHeight: any;

    constructor(
        public tagsService: TagsService,
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
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
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
        forkJoin([
            this.tokenService.getTokens(this.currentPolicy),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const data: any = value[0];
            const tagSchemas: any[] = value[1] || [];

            this.tokens = data.map((e: any) => new Token(e));
            this.tagSchemas = SchemaHelper.map(tagSchemas);

            const ids = this.tokens.map(e => e.id);
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                for (const token of this.tokens) {
                    (token as any)._tags = data[token.id];
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
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
            this.owner = profile?.did;
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

        let dialogRef;
        if (this.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
            dialogRef = this.dialog.open(TokenDialog, {
                width: `${this.innerWidth.toString()}px`,
                maxWidth: '100vw',
                height: `${this.innerHeight - headerHeight}px`,
                position: {
                    'bottom': '0'
                },
                panelClass: 'g-dialog',
                hasBackdrop: true, // Shadows beyond the dialog
                closeOnNavigation: true,
                autoFocus: false,
                data: this
            });
        } else {
            dialogRef = this.dialog.open(TokenDialog, {
                width: '750px',
                panelClass: 'g-dialog',
                disableClose: true
            });
        }

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
                case OperationMode.Freeze:
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
        user.enableAdmin = false;
        user.enableFreeze = false;
        user.enableKYC = false;
        user.enableWipe = false;
        if (res) {
            user.enableAdmin = res.enableAdmin;
            user.enableFreeze = res.enableFreeze;
            user.enableKYC = res.enableKYC;
            user.enableWipe = res.enableWipe;
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
        this.tokenService.pushFreeze(this.tokenId, user.username, freeze).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.Freeze;
            this.user = user;
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

    deleteToken(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete token',
                dialogText: 'Are you sure to delete token?'
            },
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.loading = true;
                this.tokenService.pushDelete(element.tokenId).subscribe((result) => {
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

    editToken(element: any) {

        let dialogRef;
        if (this.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
            dialogRef = this.dialog.open(TokenDialog, {
                width: `${this.innerWidth.toString()}px`,
                maxWidth: '100vw',
                height: `${this.innerHeight - headerHeight}px`,
                position: {
                    'bottom': '0'
                },
                panelClass: 'g-dialog',
                hasBackdrop: true, // Shadows beyond the dialog
                closeOnNavigation: true,
                autoFocus: false,
                data: {
                    token: element
                }
            });
        } else {
            dialogRef = this.dialog.open(TokenDialog, {
                width: '750px',
                panelClass: 'g-dialog',
                disableClose: true,
                data: {
                    token: element
                }
            });
        }

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                result.tokenId = element.tokenId;
                this.tokenService.pushUpdate(result).subscribe((result) => {
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
}
