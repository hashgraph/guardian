import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators, } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { IPolicy, IStandardRegistryResponse, IUser, LocationType, Schema, SchemaEntity, UserPermissions, } from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
//services
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { DemoService } from '../../services/demo.service';
import { SchemaService } from '../../services/schema.service';
import { HeaderPropsService } from '../../services/header-props.service';
import { InformService } from '../../services/inform.service';
import { TasksService } from '../../services/tasks.service';
//modules
import { VCViewerDialog } from '../../modules/schema-engine/vc-dialog/vc-dialog.component';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { DialogService } from 'primeng/dynamicdialog';
import { ValidateIfFieldEqual } from '../../validators/validate-if-field-equal';
import { ChangePasswordComponent } from '../login/change-password/change-password.component';
import { UserKeysDialog } from 'src/app/components/user-keys-dialog/user-keys-dialog.component';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';
import { NewRelayerAccountDialog } from 'src/app/components/new-relayer-account-dialog/new-relayer-account-dialog.component';
import { RelayerAccountDetailsDialog } from 'src/app/components/relayer-account-details-dialog/relayer-account-details-dialog.component';
import moment from 'moment';

enum OperationMode {
    None,
    Generate,
    Associate,
}

interface IStep {
    id: string;
    label: string;
    index: number;
    visibility: () => boolean;
    isFinish: () => boolean;
    canNext: () => boolean;
    next: () => void;
    canPrev: () => boolean;
    prev: () => void;
}

interface IColumn {
    id: string;
    title: string;
    type: string;
    size: string;
    tooltip: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}

/**
 * The page with the profile settings of a regular user.
 */
@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
    public loading: boolean = true;
    public subLoading: boolean = false;
    public taskId: string | undefined = undefined;
    public isConfirmed: boolean = false;
    public isFailed: boolean = false;
    public isNewAccount: boolean = false;
    public profile?: IUser | null;
    public balance?: string | null;
    public didDocument?: any;
    public vcDocument?: any;

    public steps: IStep[] = [];
    public currentStep!: IStep;

    public noFilterResults: boolean = false;

    public get hasRegistries(): boolean {
        return this.standardRegistriesList.length > 0;
    }

    public get standardRegistriesList(): IStandardRegistryResponse[] {
        return this.filteredRegistries.length > 0
            ? this.filteredRegistries
            : this.standardRegistries;
    }

    public get isFilterButtonDisabled(): boolean {
        return (
            this.filters.policyName.length === 0 &&
            this.filters.geography.length === 0
        );
    }

    public filtersForm = new UntypedFormGroup({
        policyName: new UntypedFormControl(''),
        geography: new UntypedFormControl(''),
    });

    private get filters(): { policyName: string; geography: string } {
        return {
            policyName: this.filtersForm.value?.policyName?.trim(),
            geography: this.filtersForm.value?.geography?.trim(),
        };
    }

    public get visibleSteps(): any[] {
        return this.steps.filter((s) => s.visibility());
    }

    public privateFields: any = { id: true };
    public schema!: Schema | null;
    public localFullForm!: UntypedFormGroup;
    public remoteFullForm!: UntypedFormGroup;
    public hederaCredentialsForm!: UntypedFormGroup;
    public standardRegistryForm!: UntypedFormControl;
    public locationType!: UntypedFormControl;
    public remoteUserSetupType!: UntypedFormControl;
    public didDocumentType!: UntypedFormControl;
    public didDocumentForm!: UntypedFormControl;
    public didKeysForm!: UntypedFormGroup;
    public vcDocumentType!: UntypedFormControl;
    public vcDocumentForm!: UntypedFormGroup;
    public remoteCredentialsForm!: UntypedFormGroup;
    public remoteDidDocumentForm!: UntypedFormControl;
    public didKeys: any[] = [];

    public tab: 'general' | 'keys' | 'relayerAccounts' = 'general';
    public tabIndex = 0;
    public tabs: ['general', 'relayerAccounts', 'keys'] = ['general', 'relayerAccounts', 'keys'];

    public keyPage: any[];
    public keyCount: number;
    public keyPageIndex: number;
    public keyPageSize: number;
    public keyColumns: IColumn[];

    public relayerAccountPage: any[];
    public relayerAccountCount: number;
    public relayerAccountPageIndex: number;
    public relayerAccountPageSize: number;
    public relayerAccountColumns: IColumn[];
    public searchRelayerAccount: string;
    public balances: Map<string, string>;

    public location: LocationType | undefined;

    private interval: any;
    private operationMode: OperationMode = OperationMode.None;
    private standardRegistries: IStandardRegistryResponse[] = [];
    private filteredRegistries: IStandardRegistryResponse[] = [];

    private subscription = new Subscription();

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private relayerAccountsService: RelayerAccountsService,
        private otherService: DemoService,
        private schemaService: SchemaService,
        private informService: InformService,
        private taskService: TasksService,
        private route: ActivatedRoute,
        private router: Router,
        private dialogService: DialogService,
        private headerProps: HeaderPropsService,
        private cdRef: ChangeDetectorRef
    ) {
        this.balances = new Map<string, string>();
        this.standardRegistryForm = new UntypedFormControl('', [Validators.required]);
        this.hederaCredentialsForm = new UntypedFormGroup({
            id: new UntypedFormControl('', [Validators.required, noWhitespaceValidator()]),
            key: new UntypedFormControl('', [Validators.required, noWhitespaceValidator()]),
            useFireblocksSigning: new UntypedFormControl(false),
            fireBlocksVaultId: new UntypedFormControl('', [ValidateIfFieldEqual('useFireblocksSigning', true, [])]),
            fireBlocksAssetId: new UntypedFormControl('', [ValidateIfFieldEqual('useFireblocksSigning', true, [])]),
            fireBlocksApiKey: new UntypedFormControl('', [ValidateIfFieldEqual('useFireblocksSigning', true, [])]),
            fireBlocksPrivateiKey: new UntypedFormControl('', [
                ValidateIfFieldEqual('useFireblocksSigning', true,
                    [Validators.pattern(/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/gm)]
                )
            ])
        });
        this.locationType = new UntypedFormControl(false, [Validators.required]);
        this.remoteUserSetupType = new UntypedFormControl(false, [Validators.required]);
        this.didDocumentType = new UntypedFormControl(false, [Validators.required]);
        this.didDocumentForm = new UntypedFormControl('', [Validators.required]);
        this.didKeysForm = new UntypedFormGroup({});
        this.vcDocumentType = new UntypedFormControl(false, [Validators.required]);
        this.vcDocumentForm = new UntypedFormGroup({});
        this.remoteCredentialsForm = new UntypedFormGroup({
            id: new UntypedFormControl('', [Validators.required, noWhitespaceValidator()]),
            topicId: new UntypedFormControl('', [Validators.required, noWhitespaceValidator()])
        });
        this.remoteDidDocumentForm = new UntypedFormControl('', [Validators.required]);

        this.localFullForm = new UntypedFormGroup({});
        this.localFullForm.addControl('standardRegistry', this.standardRegistryForm);
        this.localFullForm.addControl('locationType', this.locationType);
        this.localFullForm.addControl('hederaCredentials', this.hederaCredentialsForm);
        this.localFullForm.addControl('didDocumentType', this.didDocumentType);
        this.localFullForm.addControl('didDocument', this.didDocumentForm);
        this.localFullForm.addControl('didKeys', this.didKeysForm);
        this.localFullForm.addControl('vcDocumentType', this.vcDocumentType);
        this.localFullForm.addControl('vcDocument', this.vcDocumentForm);

        this.remoteFullForm = new UntypedFormGroup({});
        this.remoteFullForm.addControl('standardRegistry', this.standardRegistryForm);
        this.remoteFullForm.addControl('locationType', this.locationType);
        this.remoteFullForm.addControl('hederaCredentials', this.remoteCredentialsForm);
        this.remoteFullForm.addControl('didDocument', this.remoteDidDocumentForm);

        // Steps
        // Common
        const selectSRStep: IStep = {
            id: 'select_sr',
            label: 'Standard Registries',
            index: 0,
            visibility: () => {
                return true;
            },
            isFinish: () => {
                return false;
            },
            canNext: () => {
                return this.standardRegistryForm.valid;
            },
            next: () => {
                this.changeStep('hedera_credentials');
            },
            canPrev: () => {
                return false;
            },
            prev: () => { }
        };
        const hederaCredentialsStep: IStep = {
            id: 'hedera_credentials',
            label: 'Hedera Account',
            index: 1,
            visibility: () => {
                return true;
            },
            isFinish: () => {
                return this.locationType.value;
            },
            canNext: () => {
                return !this.locationType.value && this.hederaCredentialsForm.valid || this.remoteCredentialsForm.valid && this.remoteDidDocumentForm.valid;
            },
            next: () => {
                if (!this.locationType.value) {
                    this.changeStep('did_document');
                } else {
                    this.onSubmit();
                }
            },
            canPrev: () => {
                return true;
            },
            prev: () => {
                this.changeStep('select_sr');
            }
        }

        // Local
        const didDocumentStep: IStep = {
            id: 'did_document',
            label: 'Set Up Digital Identity',
            index: 2,
            visibility: () => {
                return !this.locationType.value;
            },
            isFinish: () => {
                return !this.didDocumentType.value && !this.vcDocumentType.value;
            },
            canNext: () => {
                if (this.didDocumentType.value) {
                    return this.didDocumentForm.valid;
                } else {
                    return true;
                }
            },
            next: () => {
                if (this.didDocumentType.value) {
                    this.parseDidDocument(() => {
                        this.changeStep('did_document_keys');
                    });
                } else {
                    if (this.vcDocumentType.value) {
                        this.changeStep('vc_document');
                    } else {
                        this.onSubmit();
                    }
                }
            },
            canPrev: () => {
                return true;
            },
            prev: () => {
                this.changeStep('hedera_credentials');
            }
        };
        const didDocumentKeysStep: IStep = {
            id: 'did_document_keys',
            label: 'DID Document signing keys',
            index: 3,
            visibility: () => {
                return !this.locationType.value && this.didDocumentType.value;
            },
            isFinish: () => {
                return !this.vcDocumentType.value;
            },
            canNext: () => {
                return this.didKeysForm.valid;
            },
            next: () => {
                this.parseDidKeys(() => {
                    if (this.vcDocumentType.value) {
                        this.changeStep('vc_document');
                    } else {
                        this.onSubmit();
                    }
                });
            },
            canPrev: () => {
                return true;
            },
            prev: () => {
                this.changeStep('did_document');
            }
        };
        const vcDocumentStep: IStep = {
            id: 'vc_document',
            label: 'VC Document',
            index: 4,
            visibility: () => {
                return !this.locationType.value && this.vcDocumentType.value;
            },
            isFinish: () => {
                return true;
            },
            canNext: () => {
                return this.vcDocumentForm.valid;
            },
            next: () => {
                this.onSubmit();
            },
            canPrev: () => {
                return true;
            },
            prev: () => {
                if (this.didDocumentType.value) {
                    this.changeStep('did_document_keys');
                } else {
                    this.changeStep('did_document');
                }
            }
        }

        this.steps = [
            // Common
            selectSRStep,
            hederaCredentialsStep,
            // Local
            didDocumentStep,
            didDocumentKeysStep,
            vcDocumentStep,
        ];
        this.currentStep = this.steps[0];

        this.keyPage = [];
        this.keyCount = 0;
        this.keyPageIndex = 0;
        this.keyPageSize = 10;
        this.keyColumns = [{
            id: 'createDate',
            title: 'Date',
            type: 'text',
            size: '300',
            tooltip: false
        }, {
            id: 'messageId',
            title: 'Message',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'policyName',
            title: 'Policy Name',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'delete',
            title: '',
            type: 'text',
            size: '64',
            tooltip: false
        }];


        this.relayerAccountPage = [];
        this.relayerAccountCount = 0;
        this.relayerAccountPageIndex = 0;
        this.relayerAccountPageSize = 10;
        this.relayerAccountColumns = [{
            id: 'account',
            title: 'Account',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'balance',
            title: 'Balance',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'refresh',
            title: 'Update date',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'options',
            title: 'Actions',
            type: 'text',
            size: '170',
            tooltip: false
        }];
    }

    ngOnInit() {
        this.loading = true;

        this.keyPage = [];
        this.keyPageIndex = 0;
        this.keyPageSize = 10;
        this.keyCount = 0;

        this.relayerAccountPage = [];
        this.relayerAccountPageIndex = 0;
        this.relayerAccountPageSize = 10;
        this.relayerAccountCount = 0;

        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                const tab = this.route.snapshot.queryParams['tab'];
                this.tabIndex = Math.max(this.tabs.indexOf(tab), 0);
                this.tab = this.tabs[this.tabIndex] || 'general';
                this.changeTab();
                this.cdRef.detectChanges();
            })
        );
        this.loadDate();
        this.update();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        clearInterval(this.interval);
    }

    public initForm($event: any) {
        this.vcDocumentForm = $event;
    }

    private update() {
        this.interval = setInterval(() => {
            if (!this.isConfirmed && !this.isNewAccount) {
                this.loadDate();
            }
        }, 15000);
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
        ]).subscribe(
            (value) => {
                this.profile = value[0] as IUser;
                this.balance = value[1] as string;

                this.isConfirmed = !!this.profile.confirmed;
                this.isFailed = !!this.profile.failed;
                this.isNewAccount = !this.profile.didDocument;
                if (this.isConfirmed) {
                    this.location = this.profile?.location;
                    this.didDocument = this.profile?.didDocument;
                    this.vcDocument = this.profile?.vcDocument;
                }

                this.standardRegistries = value[2] || [];
                this.standardRegistries = this.standardRegistries.filter((sr) => !!sr.did);

                const schema = value[3];
                if (schema) {
                    this.schema = new Schema(schema);
                    this.vcDocumentType.setValue(true);
                } else {
                    this.schema = null;
                    this.vcDocumentType.setValue(false);
                }
                setTimeout(() => {
                    this.loading = false;
                    this.headerProps.setLoading(false);
                }, 200);
            },
            ({ message }) => {
                this.loading = false;
                this.headerProps.setLoading(false);
                console.error(message);
            }
        );
    }

    public onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
    }

    public onAsyncCompleted() {
        if (this.taskId) {
            const taskId = this.taskId;
            const operationMode = this.operationMode;
            this.taskId = undefined;
            this.operationMode = OperationMode.None;
            switch (operationMode) {
                case OperationMode.Generate:
                    this.taskService.get(taskId).subscribe((task) => {
                        const { id, key } = task.result;
                        this.hederaCredentialsForm.patchValue({ id, key });
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

    public openVCDocument(document: any, title: string) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: document.id,
                row: document,
                dryRun: !!document.dryRunId,
                document: document.document,
                title: title,
                type: 'VC',
                viewDocument: true,
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    public openDIDDocument(document: any, title: string) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: document.id,
                row: document,
                dryRun: !!document.dryRunId,
                document: document.document,
                title,
                type: 'JSON',
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }




    //Steps

    private changeStep(id: string): void {
        this.currentStep = this.steps.find((s) => s.id === id) || this.steps[0];
    }

    public onPrev(): void {
        if (this.currentStep?.canPrev()) {
            this.currentStep.prev();
        }
    }

    public onNext(): void {
        if (this.currentStep?.canNext()) {
            this.currentStep.next();
        }
    }

    public canPrev(): boolean {
        return this.currentStep?.canPrev() || false;
    }

    public canNext(): boolean {
        return this.currentStep?.canNext() || false;
    }

    public isFinish(): boolean {
        return this.currentStep?.isFinish() || false;
    }

    //New User

    public applyFilters(): void {
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

    public clearFilters(): void {
        this.filtersForm.reset({ policyName: '', geography: '' });
        this.filteredRegistries = [];
        this.noFilterResults = false;
        this.selectStandardRegistry('');
    }

    public selectStandardRegistry(did: string): void {
        this.standardRegistryForm.setValue(did);
    }

    public isRegistrySelected(did: string): boolean {
        return this.standardRegistryForm.value === did;
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

    public trackByDid(index: number, registry: IStandardRegistryResponse): string {
        return registry.did;
    }

    //Hedera Credentials
    public onChangeVcForm() {
        this.vcDocumentForm.updateValueAndValidity();
    }

    public randomKey() {
        this.loading = true;
        this.otherService.pushGetRandomKey().subscribe(
            (result) => {
                const { taskId, expectation } = result;
                this.taskId = taskId;
                this.operationMode = OperationMode.Generate;
            },
            (e) => {
                this.loading = false;
                this.hederaCredentialsForm.setValue({ id: '', key: '' });
            }
        );
    }

    public onChangeDidType() {
        this.didDocumentForm.reset();
    }

    public get validForm(): boolean {
        if (this.locationType.value) {
            if (!this.standardRegistryForm.valid) {
                return false;
            }
            if (!this.remoteCredentialsForm.valid) {
                return false;
            }
            if (!this.remoteDidDocumentForm.valid) {
                return false;
            }
            return true;
        } else {
            if (!this.standardRegistryForm.valid) {
                return false;
            }
            if (!this.hederaCredentialsForm.valid) {
                return false;
            }
            if (this.didDocumentType.value) {
                if (!this.didDocumentForm.valid) {
                    return false;
                }
                if (!this.didKeysForm.valid) {
                    return false;
                }
            }
            if (this.vcDocumentType.value) {
                if (!this.vcDocumentForm.valid) {
                    return false;
                }
            }
            return true;
        }
    }

    private onSubmit() {
        if (this.validForm) {
            this.createDID();
        }
    }

    public retry() {
        this.isConfirmed = false;
        this.isFailed = false;
        this.isNewAccount = true;
        clearInterval(this.interval);
    }

    private parseDidDocument(done: Function) {
        try {
            const json = this.didDocumentForm.value;
            const document = JSON.parse(json);
            this.loading = true;
            this.profileService
                .validateDID(document)
                .subscribe(
                    (result) => {
                        if (!result.valid) {
                            if (result.error === 'DID Document already exists.') {
                                this.setErrors(this.didDocumentForm, 'exists');
                            } else {
                                this.setErrors(this.didDocumentForm, 'incorrect');
                            }
                            this.loading = false;
                            return;
                        }
                        this.didKeys = [];
                        this.didKeysForm = new UntypedFormGroup({});
                        this.localFullForm.removeControl('didKeys');
                        this.localFullForm.addControl('didKeys', this.didKeysForm);

                        const names = Object.keys(result.keys);
                        for (const name of names) {
                            const keyNameControl = new UntypedFormControl('', [Validators.required]);
                            const keyValueControl = new UntypedFormControl('', [Validators.required]);
                            const keyControl = new UntypedFormGroup({
                                name: keyNameControl,
                                value: keyValueControl
                            }, [Validators.required]);
                            const keyNames = result.keys[name] || [];
                            keyControl.setValue({
                                name: keyNames[0]?.id || '',
                                value: ''
                            });
                            this.didKeysForm.addControl(name, keyControl);
                            this.didKeys.push({
                                name,
                                keyNameControl,
                                keyValueControl,
                                keyNames
                            });
                        }
                        done();
                        this.loading = false;
                    },
                    (e) => {
                        this.setErrors(this.didDocumentForm, 'incorrect');
                        this.loading = false;
                    }
                );
        } catch (error) {
            this.setErrors(this.didDocumentForm, 'incorrect');
            this.loading = false;
        }
    }

    public parseDidKeys(done: Function) {
        try {
            const json = this.didDocumentForm.value;
            const document = JSON.parse(json);
            const keys: any[] = [];
            for (const didKey of this.didKeys) {
                keys.push({
                    id: didKey.keyNameControl.value,
                    key: didKey.keyValueControl.value
                })
            }
            this.loading = true;
            this.profileService
                .validateDIDKeys(document, keys)
                .subscribe(
                    (result) => {
                        let valid = true;
                        if (Array.isArray(result)) {
                            for (const didKey of this.didKeys) {
                                const item = result.find(k => k.id === didKey.keyNameControl.value);
                                if (!item || !item.valid) {
                                    this.setErrors(didKey.keyValueControl, 'incorrect');
                                    valid = false;
                                }
                            }
                        } else {
                            for (const didKey of this.didKeys) {
                                this.setErrors(didKey.keyValueControl, 'incorrect');
                                valid = false;
                            }
                        }
                        if (valid) {
                            done();
                        } else {
                            this.setErrors(this.didKeysForm, 'incorrect');
                        }
                        this.cdRef.detectChanges();
                        this.loading = false;
                    },
                    (e) => {
                        this.setErrors(this.didKeysForm, 'incorrect');
                        this.loading = false;
                    }
                );
        } catch (error) {
            this.setErrors(this.didKeysForm, 'incorrect');
            this.loading = false;
        }
    }

    private setErrors(form: UntypedFormControl | UntypedFormGroup, type?: string): void {
        const errors: any = {};
        errors[type || 'incorrect'] = true;
        form.setErrors(errors);
        form.markAsDirty();
        setTimeout(() => {
            form.setErrors(errors);
            form.markAsDirty();
        })
    }

    private createDID() {
        this.loading = true;
        this.headerProps.setLoading(true);
        const profile: any = {};

        if (this.locationType.value) {
            //Remote
            const data = this.remoteFullForm.value;
            profile.type = LocationType.REMOTE;
            profile.parent = data.standardRegistry;
            profile.hederaAccountId = data.hederaCredentials.id?.trim();
            profile.topicId = data.hederaCredentials.topicId;
            profile.didDocument = data.didDocument;
        } else {
            //Local
            const data = this.localFullForm.value;
            profile.type = LocationType.LOCAL;
            profile.parent = data.standardRegistry;
            profile.hederaAccountId = data.hederaCredentials.id?.trim();
            profile.hederaAccountKey = data.hederaCredentials.key?.trim();
            profile.useFireblocksSigning = data.hederaCredentials.useFireblocksSigning;
            profile.fireblocksConfig = {
                fireBlocksVaultId: data.hederaCredentials.fireBlocksVaultId,
                fireBlocksAssetId: data.hederaCredentials.fireBlocksAssetId,
                fireBlocksApiKey: data.hederaCredentials.fireBlocksApiKey,
                fireBlocksPrivateiKey: data.hederaCredentials.fireBlocksPrivateiKey
            }
            if (data.didDocumentType) {
                profile.didDocument = data.didDocument;
                profile.didKeys = [];
                for (const id of Object.keys(data.didKeys)) {
                    profile.didKeys.push({
                        id: data.didKeys[id].name,
                        key: data.didKeys[id].value
                    });
                }
            }
            if (data.vcDocumentType) {
                profile.vcDocument = data.vcDocument;
            }
        }

        this.profileService.pushSetProfile(profile).subscribe(
            (result) => {
                const { taskId, expectation } = result;
                this.taskId = taskId;
                this.router.navigate(['task', taskId], {
                    queryParams: {
                        last: btoa(location.href),
                    },
                });
            },
            ({ message }) => {
                this.loading = false;
                this.headerProps.setLoading(false);
                console.error(message);
            }
        );
    }

    public changePassword(profile: any) {
        this.dialogService.open(ChangePasswordComponent, {
            header: 'Change password',
            width: '640px',
            modal: true,
            data: {
                login: profile?.username,
            }
        }).onClose.subscribe((data) => {
            this.loadDate();
        });
    }

    public download() {
        if (this.profile) {
            const name = this.profile.username;
            const data = {
                username: this.profile.username,
                hederaAccountId: this.profile.hederaAccountId,
                topicId: this.profile.topicId,
                did: this.profile.did,
                didDocument: this.profile.didDocument?.document,
                vcDocument: this.profile.vcDocument?.document,
            }
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute('href', dataStr);
            downloadAnchorNode.setAttribute('download', name + '.user');
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
    }

    public importFromFile(event: any) {
        const reader = new FileReader()
        reader.readAsText(event);
        reader.addEventListener('load', (e: any) => {
            const json = e.target.result;
            const config = JSON.parse(json);
            this.remoteCredentialsForm.setValue({
                id: config.hederaAccountId || '',
                topicId: config.topicId || ''
            })
            this.remoteDidDocumentForm.setValue(JSON.stringify(config.didDocument))
        });
    }

    public onChangeTab(tab: any) {
        this.tabIndex = tab.index;
        this.tab = this.tabs[tab.index] || 'general';
        this.router.navigate([], {
            queryParams: { tab: this.tab }
        });
    }

    private changeTab() {
        if (this.tab === 'general') {
            this.loadDate();
        }
        if (this.tab === 'relayerAccounts') {
            this.relayerAccountPageIndex = 0;
            this.loadRelayerAccounts();
        }
        if (this.tab === 'keys') {
            this.keyPageIndex = 0;
            this.loadKeys();
        }
    }

    public loadKeys() {
        this.subLoading = true;
        this.profileService
            .keys(this.keyPageIndex, this.keyPageSize)
            .subscribe((response) => {
                const { page, count } = this.profileService.parsePage(response);
                this.keyPage = page;
                this.keyCount = count;
                this.subLoading = false;
            }, (e) => {
                this.subLoading = false;
            });
    }

    public onKeyPage(event: any): void {
        if (this.keyPageSize != event.pageSize) {
            this.keyPageIndex = 0;
            this.keyPageSize = event.pageSize;
        } else {
            this.keyPageIndex = event.pageIndex;
            this.keyPageSize = event.pageSize;
        }
        this.loadKeys();
    }

    public onCreateKey(): void {
        const dialogRef = this.dialogService.open(UserKeysDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: 'create',
            },
        });
        dialogRef.onClose.subscribe(async (result: any | null) => {
            if (result) {
                this.createKey(result.messageId);
            }
        });
    }

    public onImportKey(): void {
        const dialogRef = this.dialogService.open(UserKeysDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: 'import',
            },
        });
        dialogRef.onClose.subscribe(async (result: any | null) => {
            if (result) {
                this.createKey(result.messageId, result.key)
            }
        });
    }

    public previewKey(key: string): void {
        const dialogRef = this.dialogService.open(UserKeysDialog, {
            duplicate: true,
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: 'preview',
                key
            },
        });
        dialogRef.onClose.subscribe(async (result: any | null) => { });
    }

    public onDeleteKey(item: any) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete key',
                text: `Are you sure want to delete key?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.deleteKey(item.id)
            }
        });
    }

    public deleteKey(id: string): void {
        this.subLoading = true;
        this.profileService
            .deleteKey(id)
            .subscribe(() => {
                this.subLoading = false;
                this.loadKeys();
            }, (e) => {
                this.subLoading = false;
            });
    }

    private createKey(messageId: string, key?: string) {
        if (messageId) {
            messageId = messageId.trim();
        }
        this.profileService
            .createKey({
                messageId,
                key,
            })
            .subscribe((item) => {
                this.subLoading = false;
                this.loadKeys();
                if (!key) {
                    this.previewKey(item.key);
                }
            }, (e) => {
                this.subLoading = false;
            });
    }

    private loadRelayerAccounts() {
        const filters: any = {
            search: this.searchRelayerAccount
        };
        this.subLoading = true;
        this.relayerAccountsService
            .getRelayerAccounts(
                this.relayerAccountPageIndex,
                this.relayerAccountPageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.relayerAccountsService.parsePage(response);
                this.relayerAccountPage = page;
                this.relayerAccountCount = count;
                for (const row of page) {
                    row.__lastUpdate = '-';
                }
                setTimeout(() => {
                    this.subLoading = false;
                }, 500);
            }, (e) => {
                this.subLoading = false;
            });
    }

    public onRelayerAccountPage(event: any): void {
        if (this.relayerAccountPageSize != event.pageSize) {
            this.relayerAccountPageIndex = 0;
            this.relayerAccountPageSize = event.pageSize;
        } else {
            this.relayerAccountPageIndex = event.pageIndex;
            this.relayerAccountPageSize = event.pageSize;
        }
        this.loadRelayerAccounts();
    }

    public onCreateRelayerAccount() {
        const dialogRef = this.dialogService.open(NewRelayerAccountDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Add Relayer Account'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.subLoading = true;
                this.relayerAccountsService
                    .createRelayerAccount(result)
                    .subscribe((newItem) => {
                        this.loadRelayerAccounts();
                    }, (e) => {
                        this.subLoading = false;
                    });
            }
        });
    }

    public onOpenRelayerAccount(item: any) {
        const dialogRef = this.dialogService.open(RelayerAccountDetailsDialog, {
            showHeader: false,
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {
                relayerAccount: item
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onRelayerAccountSearch() {
        this.loadRelayerAccounts();
    }

    public getBalance(row: any) {
        return this.balances.get(row.account) || '-';
    }

    public updateBalance(row: any) {
        row.__loading = true;
        this.relayerAccountsService
            .getRelayerAccountBalance(row.account)
            .subscribe((balance) => {
                this.balances.set(row.account, balance);
                row.__loading = false;
                row.__lastUpdate = moment(Date.now()).format("YYYY-MM-DD, HH:mm");
            }, (e) => {
                row.__balance = '-';
                row.__loading = false;
            });
    }

    public updateAllBalance() {
        for (const row of this.relayerAccountPage) {
            this.updateBalance(row);
        }
    }
}
