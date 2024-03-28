import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { TokenService } from '../../services/token.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractType, SchemaHelper, TagType, Token } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { TagsService } from 'src/app/services/tag.service';
import { DialogService } from 'primeng/dynamicdialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';
import { ContractService } from 'src/app/services/contract.service';
import { TokenDialogComponent } from 'src/app/components/token-dialog/token-dialog.component';

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
    public isConfirmed: boolean = false;
    public tokens: any[] = [];
    public loading: boolean = true;
    public tokenId: string = '';
    public tokenUrl: string = '';
    public users: any[] = [];
    public usersColumns: string[] = [
        'username',
        'associated',
        'tokenBalance',
        'frozen',
        'kyc',
        'refresh'
    ];
    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;
    public operationMode: OperationMode = OperationMode.None;
    public user: any;
    public currentPolicy: any = '';
    public policies: any[] | null = null;
    public tagEntity = TagType.Token;
    public owner: any;
    public tagSchemas: any[] = [];
    public deleteTokenVisible: boolean = false;
    public currentTokenId: any;
    public dataForm = new FormGroup({
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
        enableWipe: new FormControl(true, [Validators.required]),
        wipeContractId: new FormControl(),
    });
    public dataFormPristine: any = this.dataForm.value;
    public readonlyForm: boolean = false;
    public policyDropdownItem: any;
    public tokensCount: any;
    public pageIndex: number;
    public pageSize: number;
    public contracts: any[] = [];

    constructor(
        public tagsService: TagsService,
        private auth: AuthService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private informService: InformService,
        private taskService: TasksService,
        private policyEngineService: PolicyEngineService,
        private contractService: ContractService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: DialogService
    ) {
        this.pageIndex = 0;
        this.pageSize = 10;
        this.tokensCount = 0;
    }

    ngOnInit() {
        this.loading = true;
        this.currentPolicy = this.route.snapshot.queryParams['policy'];
        this.tokenUrl = this.route.snapshot.queryParams['tokenId'];
        this.tokenId = this.tokenUrl ? atob(this.tokenUrl) : '';
        this.loadProfile();
    }

    private loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const profile = value[0];
            const policies = value[1] || [];
            const tagSchemas: any[] = value[2] || [];

            this.isConfirmed = !!(profile && profile.confirmed);
            this.owner = profile?.did;
            this.policies = policies;
            this.policies.unshift({ id: -1, name: 'All policies' });
            if (this.currentPolicy) {
                this.policyDropdownItem = policies.find(p => p.id === this.currentPolicy);
            }
            this.tagSchemas = SchemaHelper.map(tagSchemas);
            this.queryChange();
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private queryChange() {
        this.loading = true;
        if (!this.isConfirmed) {
            this.loading = false;
            return;
        }
        if (this.tokenId) {
            this.auth.getUsers().subscribe((users) => {
                this.users = users;
                this.refreshAll(this.users);
                setTimeout(() => {
                    this.loading = false;
                }, 1500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        } else {
            this.loadTokens();
        }
    }

    private loadTokens() {
        this.loading = true;
        forkJoin([
            this.tokenService.getTokensPage(this.currentPolicy, this.pageIndex, this.pageSize),
            this.contractService.getContracts({
                type: ContractType.WIPE
            })
        ]).subscribe((value) => {
            this.contracts = value[1] && value[1].body || [];
            const tokensResponse = value[0];
            const data = tokensResponse.body || [];
            this.tokens = data.map((e: any) => new Token(e));
            this.tokensCount =
                tokensResponse.headers.get('X-Total-Count') ||
                this.tokens.length;
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
        });
    }

    public onFilter() {
        this.currentPolicy =
            (this.policyDropdownItem && this.policyDropdownItem.id !== -1) ?
                this.policyDropdownItem.id : '';
        if (this.currentPolicy) {
            this.router.navigate(['/tokens'], {
                queryParams: {
                    policy: this.currentPolicy
                }
            });
        } else {
            this.router.navigate(['/tokens']);
        }
        this.queryChange();
    }

    public newToken() {
        this.readonlyForm = false;
        this.dataForm.patchValue(this.dataFormPristine);
        this.currentTokenId = null;
        this.dialog.open(TokenDialogComponent, {
            closable: true,
            modal: true,
            width: '720px',
            styleClass: 'custom-token-dialog',
            header: 'New Token',
            showHeader: false,
            data: {
                dataForm: this.dataForm,
                contracts: this.contracts,
                readonly: this.readonlyForm,
                currentTokenId: this.currentTokenId,
            }
        }).onClose.subscribe((result: any) => {
            if (!result) {
                return;
            }
            this.saveToken()
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

    private refreshUser(user: any, res: any) {
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

    public refresh(user: any) {
        user.loading = true;
        this.tokenService.info(this.tokenId, user.username).subscribe((res) => {
            this.refreshUser(user, res);
            user.loading = false;
        }, (e) => {
            console.error(e.error);
            user.loading = false;
        });
    }

    public refreshAll(users: any[]) {
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            this.refresh(user);
        }
    }

    public getColor(status: string, reverseLogic: boolean) {
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

    public freeze(user: any, freeze: boolean) {
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

    public kyc(user: any, grantKYC: boolean) {
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

    public getPoliciesInfo(policies: string[]): string {
        if (!policies || !policies.length) {
            return '';
        }
        return policies.length === 1
            ? policies[0]
            : `Used in ${policies.length} policies`;
    }

    public questToDeleteToken(token: any) {
        this.currentTokenId = token.tokenId;
        this.deleteTokenVisible = true;
    }

    public saveToken() {
        if (this.dataForm.valid) {
            this.loading = true;
            const dataValue = this.dataForm.value;
            dataValue.tokenId = this.currentTokenId ? this.currentTokenId : null;
            this.currentTokenId ? this.updateToken(dataValue) : this.createToken(dataValue);
        }
    }

    private createToken(data: any) {
        this.tokenService.pushCreate(data).subscribe((result) => {
            const { taskId, expectation } = result;
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
            const { taskId, expectation } = result;
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

    public openEditDialog(token?: any) {
        if (!token || !token.enableAdmin) {
            return;
        }
        this.currentTokenId = token.tokenId;
        this.readonlyForm = !token.draftToken;
        this.dataForm.patchValue(token);
        this.dialog.open(TokenDialogComponent, {
            closable: true,
            modal: true,
            width: '720px',
            styleClass: 'custom-token-dialog',
            header: 'Edit Token',
            showHeader: false,
            data: {
                dataForm: this.dataForm,
                contracts: this.contracts,
                readonly: this.readonlyForm,
                currentTokenId: this.currentTokenId
            }
        }).onClose.subscribe((result: any) => {
            if (!result) {
                return;
            }
            this.saveToken()
        });
    }

    public goToUsingTokens(token: any) {
        this.tokenUrl = token.url;
        this.tokenId = this.tokenUrl ? atob(this.tokenUrl) : '';
        this.router.navigate(['/tokens'], {
            queryParams: {
                tokenId: token.url,
            }
        });
        this.queryChange();
    }

    public goToTokensPage() {
        this.tokenUrl = '';
        this.tokenId = '';
        if (this.currentPolicy) {
            this.router.navigate(['/tokens'], {
                queryParams: {
                    policy: this.currentPolicy
                }
            });
        } else {
            this.router.navigate(['/tokens']);
        }
        this.queryChange();
    }

    deleteToken(deleteToken: boolean) {
        if (!deleteToken) {
            this.deleteTokenVisible = false;
            this.currentTokenId = null;
        } else {
            if (this.currentTokenId) {
                this.loading = true;
                this.tokenService.pushDelete(this.currentTokenId).subscribe((result) => {
                    const { taskId, expectation } = result;
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

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadTokens();
    }
}
