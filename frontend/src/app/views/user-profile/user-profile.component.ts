import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Subscription } from 'rxjs';
import { IUser, Token, SchemaEntity, Schema, TagType, SchemaHelper } from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
//services
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { TokenService } from '../../services/token.service';
import { DemoService } from '../../services/demo.service';
import { SchemaService } from '../../services/schema.service';
import { HeaderPropsService } from '../../services/header-props.service';
import { InformService } from '../../services/inform.service';
import { TasksService } from '../../services/tasks.service';
import { WebSocketService } from '../../services/web-socket.service';
import { TagsService } from '../../services/tag.service';
import { ContractService } from '../../services/contract.service';
//modules
import { VCViewerDialog } from '../../modules/schema-engine/vc-dialog/vc-dialog.component';
import { RetireTokenDialogComponent } from 'src/app/components/retire-token-dialog/retire-token-dialog.component';

enum OperationMode {
    None, Generate, SetProfile, Associate
}

interface IHederaForm {
    id: string,
    key: string,
    standardRegistry: string,
    vc?: any
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
    contractRequests?: any[];
    didDocument?: any;
    vcDocument?: any;
    standardRegistries?: IUser[];
    selectedIndex: number = 0;
    tagEntity = TagType.Token;
    owner: any;

    public innerWidth: any;
    public innerHeight: any;

    hederaForm = this.fb.group({
        standardRegistry: ['', Validators.required],
        id: ['', Validators.required],
        key: ['', Validators.required],
    });


    displayedColumns: string[] = [
        'name',
        'associated',
        'tokenBalance',
        'frozen',
        'kyc',
        'policies',
        'tags'
    ];

    displayedColumnsContractRequests: string[] = [
        'contractId',
        'baseTokenId',
        'oppositeTokenId',
        'baseTokenCount',
        'oppositeTokenCount',
        'cancel'
    ];

    private interval: any;

    hideVC: any;
    schema!: Schema | null;
    vcForm!: FormGroup;

    value: any;
    operationMode: OperationMode = OperationMode.None;
    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;
    tagSchemas: Schema[] = [];

    private subscription = new Subscription();
    private tabs = ['account', 'tokens', 'retire'];

    constructor(
        public tagsService: TagsService,
        private auth: AuthService,
        private profileService: ProfileService,
        private tokenService: TokenService,
        private otherService: DemoService,
        private schemaService: SchemaService,
        private informService: InformService,
        private taskService: TasksService,
        private webSocketService: WebSocketService,
        private contractService: ContractService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        public dialog: MatDialog,
        private headerProps: HeaderPropsService
    ) {
        this.standardRegistries = [];
        this.hideVC = {
            id: true
        }
        this.vcForm = new FormGroup({});
    }

    ngOnInit() {
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
        this.loading = true;
        this.loadDate();
        this.update();
        this.subscription.add(
            this.route.queryParams.subscribe(params => {
                const tab = this.route.snapshot.queryParams['tab'] || '';
                this.selectedIndex = 0;
                for (let index = 0; index < this.tabs.length; index++) {
                    if (tab === this.tabs[index]) {
                        this.selectedIndex = index;
                    }
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        clearInterval(this.interval)
    }

    update() {
        this.interval = setInterval(() => {
            if (!this.isConfirmed && !this.isNewAccount) {
                this.loadDate();
            }
        }, 15000);
    }

    private loadAccountData() {
        setTimeout(() => {
            this.loading = false;
            this.headerProps.setLoading(false);
        }, 200);
    }

    private loadTokenData() {
        this.loading = true;

        forkJoin([
            this.tokenService.getTokens(),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const tokens: any[] = value[0];
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


            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200)
        }, (error) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(error);
        });
    }

    private loadRetireData() {
        this.loading = true;
        this.contractService.getRetireRequestsAll().subscribe((contracts) => {
            this.contractRequests = contracts;
            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200)
        }, (error) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(error);
        });
    }

    private loadDate() {
        this.balance = null;
        this.didDocument = null;
        this.vcDocument = null;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.profileService.getBalance(),
            this.auth.getStandardRegistries(),
            this.schemaService.getSystemSchemasByEntity(SchemaEntity.USER),
        ]).subscribe((value) => {
            this.profile = value[0] as IUser;
            this.balance = value[1] as string;
            this.standardRegistries = value[2] || [];
            const schema = value[3];

            this.isConfirmed = !!this.profile.confirmed;
            this.isFailed = !!this.profile.failed;
            this.isNewAccount = !this.profile.didDocument;
            if (this.isConfirmed) {
                this.didDocument = this.profile?.didDocument;
                this.vcDocument = this.profile?.vcDocument;
            }
            this.owner = this.profile?.did;

            this.standardRegistries = this.standardRegistries.filter(sr => !!sr.did);
            if (schema) {
                this.schema = new Schema(schema);
                this.hederaForm.addControl('vc', this.vcForm);
            } else {
                this.schema = null;
            }

            if (this.selectedIndex === 0) {
                this.loadAccountData();
            } else if (this.selectedIndex === 1) {
                this.loadTokenData();
            } else if (this.selectedIndex === 2) {
                this.loadRetireData();
            } else {
                setTimeout(() => {
                    this.loading = false;
                    this.headerProps.setLoading(false);
                }, 200);
            }
        }, (error) => {
            this.loading = false;
            this.headerProps.setLoading(false);
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
        this.headerProps.setLoading(true);
        const vcDocument = data.vc;
        const profile: any = {
            hederaAccountId: data.id,
            hederaAccountKey: data.key,
            parent: data.standardRegistry,
        }
        if (vcDocument) {
            profile.vcDocument = vcDocument;
        }

        this.profileService.pushSetProfile(profile).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.SetProfile;
        }, (error) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(error);
        });
    }

    randomKey() {
        this.loading = true;
        const value: any = {
            standardRegistry: this.hederaForm.value.standardRegistry,
        }
        if (this.hederaForm.value.vc) {
            value.vc = this.hederaForm.value.vc;
        }

        this.otherService.pushGetRandomKey().subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.Generate;
            this.value = value;
        }, (e) => {
            this.loading = false;
            value.id = '';
            value.key = '';
            this.hederaForm.setValue(value);
        });
    }

    getColor(status: string, reverseLogic: boolean) {
        if (status === 'n/a') return 'grey';
        else if (status === 'Yes') return reverseLogic ? 'red' : 'green';
        else return reverseLogic ? 'green' : 'red';
    }

    associate(token: Token) {
        this.loading = true;
        this.tokenService.pushAssociate(token.tokenId, token.associated != 'Yes').subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.Associate;
        }, (error) => {
            this.loading = false;
        });
    }

    openVCDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document.document,
                title: title,
                type: 'VC',
                viewDocument: true
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }

    openDIDDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document.document,
                title: title,
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

    getPoliciesInfo(policies: string[]): string {
        if (!policies || !policies.length) {
            return '';
        }
        return policies.length === 1
            ? policies[0]
            : `Used in ${policies.length} policies`;
    }

    onChangeForm() {
        this.vcForm.updateValueAndValidity();
    }

    cancelContractRequest(id: string) {
        this.loading = true;
        this.contractService.cancelContractRequest(id).subscribe(
            () => {
                setTimeout(this.loadDate.bind(this), 2000);
            },
            () => (this.loading = false)
        );
    }

    createRetireRequest() {

        let dialogRef;
        if (this.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
            dialogRef = this.dialog.open(RetireTokenDialogComponent, {
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
                    tokens: this.tokens,
                },
            });
        } else {
            dialogRef = this.dialog.open(RetireTokenDialogComponent, {
                width: '800px',
                panelClass: 'g-dialog',
                disableClose: true,
                autoFocus: false,
                data: {
                    tokens: this.tokens,
                },
            });
        }
        
        this.loading = false;
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.contractService
                    .createRetireRequest(
                        result.contractId,
                        result.baseTokenId,
                        result.oppositeTokenId,
                        result.baseTokenCount,
                        result.oppositeTokenCount,
                        result.baseTokenSerials,
                        result.oppositeTokenSerials
                    )
                    .subscribe(
                        () => {
                            setTimeout(this.loadDate.bind(this), 2000);
                        },
                        () => (this.loading = false)
                    );
            }
        });
    }

    viewRetireRequest(document: any) {
        this.dialog.open(VCViewerDialog, {
            width: '600px',
            data: {
                document: document.document,
                title: 'View Retire Request Result',
                type: 'VC',
                viewDocument: true
            }
        });
    }

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
        this.value = null;
    }

    onAsyncCompleted() {
        if (this.taskId) {
            const taskId = this.taskId;
            const value = this.value;
            const operationMode = this.operationMode;
            this.taskId = undefined;
            this.operationMode = OperationMode.None;
            switch (operationMode) {
                case OperationMode.Generate:
                    this.taskService.get(taskId).subscribe((task) => {
                        const { id, key } = task.result;
                        value.id = id;
                        value.key = key;
                        this.hederaForm.setValue(value);
                        this.loading = false;
                    });
                    break;
                case OperationMode.SetProfile:
                    this.webSocketService.updateProfile();
                    this.loadDate();
                    break;
                case OperationMode.Associate:
                    this.loadDate();
                    break;
                default:
                    console.log('Not supported mode');
                    break;
            }
        }
    }

    onChange(event: any) {
        this.selectedIndex = event;
        this.router.navigate(['/user-profile'], {
            queryParams: { tab: this.tabs[this.selectedIndex] }
        });
        if (this.selectedIndex === 0) {
            this.loadAccountData();
        } else if (this.selectedIndex === 1) {
            this.loadTokenData();
        } else if (this.selectedIndex === 2) {
            this.loadRetireData();
        } else {
            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200);
        }
    }
}
