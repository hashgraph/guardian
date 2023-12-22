import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { TokenService } from '../../services/token.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaHelper, TagType, Token } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { TagsService } from 'src/app/services/tag.service';
import { DialogService } from 'primeng/dynamicdialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';

enum OperationMode {
    None, Kyc, Freeze
}

/**
 * Page for creating tokens.
 */
@Component({
    selector: 'app-token-config',
    templateUrl: './token-config.component.html',
    styleUrls: ['./token-config.component.scss'],
    providers: [DialogService]
})
export class TokenConfigComponent implements OnInit {
    isConfirmed: boolean = false;
    tokens: any[] = [];
    loading: boolean = true;
    tokenId: string = ''
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

    tokenDialogVisible: boolean = false;
    deleteTokenVisible: boolean = false;
    currentTokenId: any;
    dataForm = new FormGroup({
        draftToken: new FormControl(true, [Validators.required]),
        tokenName: new FormControl('Token Name', [Validators.required, noWhitespaceValidator()]),
        tokenSymbol: new FormControl('F', [Validators.required, noWhitespaceValidator()]),
        tokenType: new FormControl('fungible', [Validators.required]),
        decimals: new FormControl('2'),
        initialSupply: new FormControl('0'),
        enableAdmin: new FormControl(true, [Validators.required]),
        changeSupply: new FormControl(true, [Validators.required]),
        enableFreeze: new FormControl(false, [Validators.required]),
        enableKYC: new FormControl(false, [Validators.required]),
        enableWipe: new FormControl(true, [Validators.required])
    });
    dataFormPristine: any = this.dataForm.value;
    readonlyForm: boolean = false;
    hideType: boolean = false;

    policyDropdownItem: any;

    public innerWidth: any;
    public innerHeight: any;

    public tokensCount: any;
    public pageIndex: number;
    public pageSize: number;

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
        public dialog: DialogService
    ) {
        this.pageIndex = 0;
        this.pageSize = 10;
        this.tokensCount = 0;
    }

    ngOnInit() {
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
        this.tokenId = '';
        this.loading = true;
        this.currentPolicy = this.route.snapshot.queryParams['policy'];
        this.route.queryParams.subscribe(queryParams => {
            this.loadProfile();
        });
    }

    onFilter() {
        this.currentPolicy = this.policyDropdownItem.id === -1 ? '' : this.policyDropdownItem.id;
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
        this.loading = true;

        forkJoin([
            this.tokenService.getTokensPage(this.currentPolicy, this.pageIndex, this.pageSize),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const tokensResponse = value[0];
            const data = tokensResponse.body || [];
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

            this.tokensCount =
                tokensResponse.headers.get('X-Total-Count') ||
                this.tokens.length;
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
            this.tokenId = '';
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
            this.policies.unshift({id: -1, name: 'All policies'});
            if (this.isConfirmed) {
                this.queryChange();
            } else {
                this.loading = false;
            }
        }, ({message}) => {
            this.loading = false;
            console.error(message);
        });
    }

    newToken() {
        this.readonlyForm = false;
        this.dataForm.patchValue(this.dataFormPristine);
        this.tokenDialogVisible = true;
        this.currentTokenId = null;
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
                case OperationMode.Kyc:
                    this.taskService.get(taskId).subscribe((task) => {
                        this.loading = false;
                        const {result} = task;
                        this.refreshUser(this.user, result);
                        this.user = null;
                    });
                    break;
                case OperationMode.Freeze:
                    this.taskService.get(taskId).subscribe((task) => {
                        this.loading = false;
                        const {result} = task;
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
        user.associated = 'n/a';
        user.balance = 'n/a';
        user.hBarBalance = 'n/a';
        user.frozen = 'n/a';
        user.kyc = 'n/a';
        user.enableAdmin = false;
        user.enableFreeze = false;
        user.enableKYC = false;
        user.enableWipe = false;
        if (res) {
            user.enableAdmin = res.enableAdmin;
            user.enableFreeze = res.enableFreeze;
            user.enableKYC = res.enableKYC;
            user.enableWipe = res.enableWipe;
            user.associated = res.associated ? 'Yes' : 'No';
            if (res.associated) {
                user.balance = res.balance;
                user.hBarBalance = res.hBarBalance;
                user.frozen = res.frozen ? 'Yes' : 'No';
                user.kyc = res.kyc ? 'Yes' : 'No';
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
        if (!status) {
            return 'na';
        }
        if (status === 'n/a') {
            return 'na';
        } else if (status === 'Yes') {
            return reverseLogic ? 'red' : 'green';
        } else {
            return reverseLogic ? 'green' : 'red';
        }
    }

    freeze(user: any, freeze: boolean) {
        this.loading = true;
        this.tokenService.pushFreeze(this.tokenId, user.username, freeze).subscribe((result) => {
            const {taskId, expectation} = result;
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
            const {taskId, expectation} = result;
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
            return '';
        }
        return policies.length === 1
            ? policies[0]
            : `Used in ${policies.length} policies`;
    }

    questToDeleteToken(token: any) {
        this.currentTokenId = token.tokenId;
        this.deleteTokenVisible = true;
    }

    saveToken() {
        if (this.dataForm.valid) {
            this.loading = true;
            const dataValue = this.dataForm.value;
            dataValue.tokenId = this.currentTokenId ? this.currentTokenId : null;
            this.currentTokenId ? this.updateToken(dataValue) : this.createToken(dataValue);
        }
    }

    private createToken(data: any) {
        this.tokenService.pushCreate(data).subscribe((result) => {
            const {taskId, expectation} = result;
            this.router.navigate(['task', taskId], {
                queryParams: {
                    last: btoa(location.href)
                }
            });
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    private updateToken(data: any) {
        this.tokenService.pushUpdate(data).subscribe((result) => {
            const {taskId, expectation} = result;
            this.router.navigate(['task', taskId], {
                queryParams: {
                    last: btoa(location.href)
                }
            });
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    openEditDialog(token?: any) {
        if (token) {
            this.currentTokenId = token.tokenId;
            this.readonlyForm = !token.draftToken;
            this.dataForm.patchValue(token);
        } else {
            this.tokenDialogVisible = true;
            this.readonlyForm = !token.draftToken;
        }
        this.tokenDialogVisible = true;
    }

    goToUsingTokens(token: any) {
        this.router.navigate(['/tokens'], {
            queryParams: {
                tokenId: token.url,
            }
        });
    }

    deleteToken(deleteToken: boolean) {
        if (!deleteToken) {
            this.deleteTokenVisible = false;
            this.currentTokenId = null;
        } else {
            if (this.currentTokenId) {
                this.loading = true;
                this.tokenService.pushDelete(this.currentTokenId).subscribe((result) => {
                    const {taskId, expectation} = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        }
    }

    newOnPage() {
        this.pageIndex = 0;
        this.loadTokens();
    }

    movePageIndex(inc: number) {
        if (
            inc > 0 &&
            this.pageIndex < this.tokensCount / this.pageSize - 1
        ) {
            this.pageIndex += 1;
            this.loadTokens();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.loadTokens();
        }
    }
}
