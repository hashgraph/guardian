import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { TokenService } from '../../services/token.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, LocationType, SchemaHelper, TagType, Token, UserPermissions } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { TagsService } from 'src/app/services/tag.service';
import { DialogService } from 'primeng/dynamicdialog';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';

enum OperationMode {
    None, Generate, Associate
}

/**
 * Page for creating tokens.
 */
@Component({
    selector: 'app-list-of-tokens-user',
    templateUrl: './list-of-tokens-user.component.html',
    styleUrls: ['./list-of-tokens-user.component.scss'],
    providers: [DialogService]
})
export class ListOfTokensUserComponent implements OnInit {
    public user: UserPermissions = new UserPermissions();
    public profile?: IUser | null;
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public isFailed: boolean = false;
    public isLocalUser: boolean = false;

    public tokenId: string = '';
    public tokenUrl: string = '';

    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;
    public operationMode: OperationMode = OperationMode.None;

    public policies: any[] | null = null;
    public tagEntity = TagType.Token;
    public owner: any;
    public tagSchemas: any[] = [];

    public tokens: any[] = [];
    public columns: any[];
    public tokensCount: any;
    public pageIndex: number;
    public pageSize: number;

    public users: any[] = [];
    public usersColumns: any[];
    public userPageCount: any;
    public userPageIndex: number;
    public userPageSize: number;

    public tokenName: string;

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private relayerAccountsService: RelayerAccountsService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: DialogService
    ) {
        this.pageIndex = 0;
        this.pageSize = 10;
        this.tokensCount = 0;
        this.columns = [{
            id: 'id',
            title: 'TOKEN ID',
            type: 'text',
            size: '150',
            tooltip: false
        }, {
            id: 'symbol',
            title: 'TOKEN SYMBOL',
            type: 'text',
            size: '180',
            tooltip: false
        }, {
            id: 'name',
            title: 'TOKEN NAME',
            type: 'text',
            size: 'auto',
            tooltip: true
        }, {
            id: 'policies',
            title: 'POLICIES',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'tags',
            title: 'TAGS',
            type: 'text',
            size: '220',
            tooltip: false
        }, {
            id: 'options',
            title: 'ACCOUNTS',
            type: 'text',
            size: '120',
            tooltip: false
        }]

        this.userPageIndex = 0;
        this.userPageSize = 10;
        this.userPageCount = 0;
        this.usersColumns = [{
            id: 'id',
            title: 'ACCOUNT ID',
            type: 'text',
            size: '150',
            tooltip: false
        }, {
            id: 'name',
            title: 'NAME',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'balance',
            title: 'BALANCE',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'associate',
            title: 'ASSOCIATE',
            type: 'text',
            size: '150',
            tooltip: false
        }, {
            id: 'freeze',
            title: 'FROZEN',
            type: 'text',
            size: '150',
            tooltip: false
        }, {
            id: 'kyc',
            title: 'KYCD',
            type: 'text',
            size: '150',
            tooltip: false
        }, {
            id: 'refresh',
            title: 'REFRESH',
            type: 'text',
            size: '120',
            tooltip: false
        }]
    }

    ngOnInit() {
        this.loading = true;
        this.tokenUrl = this.route.snapshot.queryParams['tokenId'];
        this.tokenId = this.tokenUrl ? atob(this.tokenUrl) : '';
        this.loadDate();
    }

    private loadDate() {
        this.loading = true;

        this.profileService.getProfile().subscribe((data) => {
            this.profile = data as IUser;
            this.user = new UserPermissions(this.profile);
            this.isConfirmed = !!this.profile.confirmed;
            this.isFailed = !!this.profile.failed;
            this.isLocalUser = this.profile.location === LocationType.LOCAL;
            this.owner = this.profile?.did;

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
            this.loadRelayerAccounts();
        } else {
            this.loadTokenData();
        }
    }

    private loadTokenData() {
        this.loading = true;

        forkJoin([
            this.tokenService.getTokensPage(
                undefined,
                this.pageIndex,
                this.pageSize,
                'Associated'
            ),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const tokensResponse = value[0];
            const tokens = tokensResponse.body || [];
            const tagSchemas: any[] = value[1] || [];

            this.tokens = tokens.map((e: any) => {
                return {
                    ...new Token(e),
                    policies: e.policies,
                    serials: e.serials,
                    decimals: e.decimals
                }
            });
            this.tagSchemas = SchemaHelper.map(tagSchemas);
            this.tokensCount =
                tokensResponse.headers.get('X-Total-Count') ||
                this.tokens.length;
            this.loadTagsData();
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadTagsData() {
        if (this.user.TAGS_TAG_READ) {
            const ids = this.tokens.map(e => e.id);
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                if (this.tokens) {
                    for (const token of this.tokens) {
                        (token as any)._tags = data[token.id];
                    }
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        } else {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }
    }

    private loadRelayerAccounts() {
        forkJoin([
            this.tokenService.getTokenById(this.tokenId),
            this.relayerAccountsService
                .getUserRelayerAccounts(
                    this.pageIndex,
                    this.pageSize,
                )
        ]).subscribe(([token, response]) => {
            this.tokenName = token?.body?.tokenName || this.tokenId;
            const { page, count } = this.relayerAccountsService.parsePage(response);
            this.users = page || [];
            this.userPageCount = count || this.users.length;
            for (const item of this.users) {
                if (!item.relayerAccountId) {
                    item.relayerAccountId = item.hederaAccountId;
                    item.relayerAccountName = 'Default';
                }
            }

            this.refreshAll(this.users);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public associate(user: any) {
        this.loading = true;
        this.tokenService
            .pushAssociateWithAccount(
                this.tokenId,
                user.relayerAccountId,
                user.associated != 'Yes'
            )
            .subscribe(
                (result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                    this.operationMode = OperationMode.Associate;
                    this.loadDate()
                },
                (error) => {
                    this.loading = false;
                    this.loadDate()
                }
            );
    }

    public getColor(status: string) {
        switch (status) {
            case 'Yes':
                return 'green';
            case 'No':
                return 'red';
            default:
                return 'na';
        }
    }

    public getPoliciesInfo(policies: string[]): string {
        if (!policies || !policies.length) {
            return '';
        }
        return policies.length === 1
            ? policies[0]
            : `Used in ${policies.length} policies`;
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadDate();
    }

    public goToUsingTokens(token: any) {
        this.tokenUrl = token.url;
        this.tokenId = this.tokenUrl ? atob(this.tokenUrl) : '';
        this.router.navigate(['/tokens-user'], {
            queryParams: {
                tokenId: token.url,
            }
        });
        this.queryChange();
    }

    public refreshAll(users: any[]) {
        for (const item of users) {
            item.loading = true;
        }
        setTimeout(() => {
            for (const item of users) {
                this.refresh(item);
            }
        }, 1000);
    }

    public refresh(user: any) {
        user.loading = true;
        this.tokenService
            .relayerAccountInfo(this.tokenId, user.relayerAccountId)
            .subscribe((res) => {
                this.refreshUser(user, res);
                user.loading = false;
            }, (e) => {
                console.error(e.error);
                user.loading = false;
            });
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

    public onUserPage(event: any): void {
        if (this.userPageSize != event.pageSize) {
            this.userPageIndex = 0;
            this.userPageSize = event.pageSize;
        } else {
            this.userPageIndex = event.pageIndex;
            this.userPageSize = event.pageSize;
        }
        this.loadRelayerAccounts();
    }

    public goToTokensPage() {
        this.tokenUrl = '';
        this.tokenId = '';
        this.router.navigate(['/tokens-user']);
        this.queryChange();
    }
}
