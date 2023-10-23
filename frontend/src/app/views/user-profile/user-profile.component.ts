import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Subscription } from 'rxjs';
import { IUser, Token, SchemaEntity, Schema, TagType, SchemaHelper, IStandardRegistryResponse, IPolicy } from '@guardian/interfaces';
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
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { UserRetirePoolsDialogComponent } from 'src/app/modules/contract-engine/dialogs/user-retire-pools-dialog/user-retire-pools-dialog.component';
import { UserRetireRequestsDialogComponent } from 'src/app/modules/contract-engine/dialogs/user-retire-requests-dialog/user-retire-requests-dialog.component';

enum OperationMode {
    None, Generate, Associate
}

/**
 * The page with the profile settings of a regular user.
 */
@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
    loading: boolean = true;
    isConfirmed: boolean = false;
    isFailed: boolean = false;
    isNewAccount: boolean = false;
    noFilterResults: boolean = false;
    profile?: IUser | null;
    balance?: string | null;
    tokens?: Token[] | null;
    contractRequests?: any[];
    didDocument?: any;
    vcDocument?: any;
    standardRegistries: IStandardRegistryResponse[] = [];
    filteredRegistries: IStandardRegistryResponse[] = [];
    selectedIndex: number = 0;
    tagEntity = TagType.Token;
    owner: any;

    public innerWidth: any;
    public innerHeight: any;

    hederaForm = new FormGroup({
        standardRegistry: new FormControl('', [Validators.required]),
        id: new FormControl('', [Validators.required, noWhitespaceValidator()]),
        key: new FormControl('', [Validators.required, noWhitespaceValidator()]),
    });

    filtersForm = new FormGroup({
        policyName: new FormControl(''),
        geography: new FormControl(''),
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
        'date',
        'operation'
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
        public dialog: MatDialog,
        private headerProps: HeaderPropsService
    ) {
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
            this.route.queryParams.subscribe((params) => {
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
        }, ({ message }) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(message);
        });
    }

    private loadRetireData() {
        this.contractRequests = [];
            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200)
        this.loading = true;
        this.contractService.getRetireVCs().subscribe((contracts) => {
            this.contractRequests = contracts.body;
            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200)
        }, ({ message }) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(message);
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
            this.auth.getAggregatedStandardRegistries(),
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
        }, ({ message }) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(message);
        });
    }

    onHederaSubmit() {
        if (this.hederaForm.valid) {
            this.createDID();
        }
    }

    createDID() {
        this.loading = true;
        this.headerProps.setLoading(true);
        const data = this.hederaForm.value;
        const vcDocument = data.vc;
        const profile: any = {
            hederaAccountId: data.id?.trim(),
            hederaAccountKey: data.key?.trim(),
            parent: data.standardRegistry,
        }
        if (vcDocument) {
            profile.vcDocument = vcDocument;
        }

        this.profileService.pushSetProfile(profile).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.router.navigate(['task', taskId], {
                queryParams: {
                    last: btoa(location.href)
                }
            });
        }, ({ message }) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(message);
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
        this.tokenService
            .pushAssociate(token.tokenId, token.associated != 'Yes')
            .subscribe(
                (result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                    this.operationMode = OperationMode.Associate;
                },
                (error) => {
                    this.loading = false;
                }
            );
    }

    openVCDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                id: document.id,
                dryRun: !!document.dryRunId,
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
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                id: document.id,
                dryRun: !!document.dryRunId,
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

    getDate(date: string) {
        return new Date(date).toLocaleString();
    }

    openRetirePoolsDialog() {
        const dialogRef = this.dialog.open(UserRetirePoolsDialogComponent, {
            width: '800px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
        });
        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.contractService.retire(result.poolId, result.retireForm).subscribe(
                () => {
                    this.loadRetireData();
                },
                () => {
                    this.loading = false
                }
            );
        })
    }

    openRetireRequestsDialog() {
        this.dialog.open(UserRetireRequestsDialogComponent, {
            width: '800px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
        });
    }

    viewRetireRequest(document: any) {
        this.dialog.open(VCViewerDialog, {
            width: '850px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                id: document.id,
                dryRun: !!document.dryRunId,
                document: document.document,
                title: 'View retire result',
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

    trackByDid(index: number, registry: IStandardRegistryResponse): string {
        return registry.did;
    }

    applyFilters(): void {
        if (this.filters.policyName && this.filters.geography) {
            this.filterByPolicyNameAndGeography();
            this.handleFiltering();
            return;
        }

        this.filters.policyName
            ? this.filterByPolicyName()
            : this.filterByGeography();
        this.handleFiltering();
    }

    clearFilters(): void {
        this.filtersForm.reset({ policyName: '', geography: '' });
        this.filteredRegistries = [];
        this.noFilterResults = false;
        this.selectStandardRegistry('');
    }

    selectStandardRegistry(did: string): void {
        this.standardRegistryControl.setValue(did);
    }

    isRegistrySelected(did: string): boolean {
        return this.standardRegistryControl.value === did;
    }

    private filterByPolicyName(): void {
        this.filteredRegistries = this.standardRegistries.filter(
            (registry: IStandardRegistryResponse) =>
                this.isRegistryContainPolicy(registry)
        );
    }

    private filterByGeography(): void {
        this.filteredRegistries = this.standardRegistries.filter(
            (registry: IStandardRegistryResponse) =>
                this.isGeographyEqualToFilter(registry)
        );
    }

    private filterByPolicyNameAndGeography(): void {
        this.filteredRegistries = this.standardRegistries.filter(
            (registry: IStandardRegistryResponse) =>
                this.isGeographyEqualToFilter(registry) &&
                this.isRegistryContainPolicy(registry)
        );
    }

    private isRegistryContainPolicy(
        registry: IStandardRegistryResponse
    ): boolean {
        return (
            registry.policies.filter((policy: IPolicy) =>
                policy.name
                    .toLowerCase()
                    .includes(this.filters.policyName.toLowerCase())
            ).length > 0
        );
    }

    private isGeographyEqualToFilter(
        registry: IStandardRegistryResponse
    ): boolean | undefined {
        return registry.vcDocument.document?.credentialSubject[0]?.geography
            ?.toLowerCase()
            .includes(this.filters.geography.toLowerCase());
    }

    private handleFiltering(): void {
        this.noFilterResults = this.filteredRegistries.length === 0;
        this.selectStandardRegistry('');
    }

    private get filters(): { policyName: string; geography: string } {
        return {
            policyName: this.filtersForm.value?.policyName?.trim(),
            geography: this.filtersForm.value?.geography?.trim(),
        };
    }

    private get standardRegistryControl(): AbstractControl {
        return this.hederaForm.get('standardRegistry') as AbstractControl;
    }

    get standardRegistriesList(): IStandardRegistryResponse[] {
        return this.filteredRegistries.length > 0
            ? this.filteredRegistries
            : this.standardRegistries;
    }

    get hasRegistries(): boolean {
        return this.standardRegistriesList.length > 0;
    }

    get isStandardRegistrySelected(): boolean {
        return !!this.standardRegistryControl.valid;
    }

    get isFilterButtonDisabled(): boolean {
        return (
            this.filters.policyName.length === 0 &&
            this.filters.geography.length === 0
        );
    }
}