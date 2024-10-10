import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { TokenService } from '../../services/token.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, SchemaHelper, TagType, Token, UserPermissions } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { TagsService } from 'src/app/services/tag.service';
import { DialogService } from 'primeng/dynamicdialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';

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
    public tokens: any[] = [];
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public isFailed: boolean = false;
    public isNewAccount: boolean = false;

    public value: any;

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
    public selectedUser: any;
    public currentPolicy: any = '';
    public policies: any[] | null = null;
    public tagEntity = TagType.Token;
    public owner: any;
    public tagSchemas: any[] = [];

    public tokenDialogVisible: boolean = false;
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
        enableWipe: new FormControl(true, [Validators.required])
    });
    public dataFormPristine: any = this.dataForm.value;
    public readonlyForm: boolean = false;
    public hideType: boolean = false;

    public policyDropdownItem: any;

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
        this.loading = true;
        this.currentPolicy = this.route.snapshot.queryParams['policy'];
        this.route.queryParams.subscribe(queryParams => {
            this.loadDate();
        });
    }

    private loadDate() {
        this.loading = true;

        this.profileService.getProfile().subscribe((data) => {
            this.profile = data as IUser;
            this.user = new UserPermissions(this.profile);
            this.isConfirmed = !!this.profile.confirmed;
            this.isFailed = !!this.profile.failed;
            this.isNewAccount = !this.profile.didDocument;
            this.owner = this.profile?.did;

            this.loadTokenData();

        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
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

    associate(token: Token) {
        this.loading = true;
        this.tokenService
            .pushAssociate(token.tokenId, token.associated != 'Yes')
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

    getColor(status: string) {
        switch (status) {
            case 'Yes':
                return 'green';
            case 'No':
                return 'red';
            default:
                return 'na';
        }
    }

    getPoliciesInfo(policies: string[]): string {
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
}
