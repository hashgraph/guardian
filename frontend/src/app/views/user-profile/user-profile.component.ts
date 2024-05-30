import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { IPolicy, IStandardRegistryResponse, IUser, Schema, SchemaEntity, } from '@guardian/interfaces';
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

enum OperationMode {
    None,
    Generate,
    Associate,
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
    public taskId: string | undefined = undefined;
    public isConfirmed: boolean = false;
    public isFailed: boolean = false;
    public isNewAccount: boolean = false;
    public profile?: IUser | null;
    public balance?: string | null;
    public didDocument?: any;
    public vcDocument?: any;

    public steps: {
        label: string,
        index: number,
        visibility: () => boolean,
        isFinish: () => boolean,
        canNext: () => boolean,
        next: () => void
    }[] = [];

    public currentStep: number = 0;

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

    public filtersForm = new FormGroup({
        policyName: new FormControl(''),
        geography: new FormControl(''),
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
    public fullForm!: FormGroup;
    public hederaCredentialsForm!: FormGroup;
    public standardRegistryForm!: FormControl;
    public didDocumentType!: FormControl;
    public didDocumentForm!: FormControl;
    public didKeysForm!: FormGroup;
    public vcDocumentType!: FormControl;
    public vcDocumentForm!: FormGroup;
    public didKeys: any[] = [];

    private interval: any;
    private operationMode: OperationMode = OperationMode.None;
    private standardRegistries: IStandardRegistryResponse[] = [];
    private filteredRegistries: IStandardRegistryResponse[] = [];

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private otherService: DemoService,
        private schemaService: SchemaService,
        private informService: InformService,
        private taskService: TasksService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog,
        public dialogService: DialogService,
        private headerProps: HeaderPropsService,
        private cdRef: ChangeDetectorRef
    ) {
        this.standardRegistryForm = new FormControl('', [Validators.required]);
        this.hederaCredentialsForm = new FormGroup({
            id: new FormControl('', [Validators.required, noWhitespaceValidator()]),
            key: new FormControl('', [Validators.required, noWhitespaceValidator()]),
            useFireblocksSigning: new FormControl(false),
            fireBlocksVaultId: new FormControl('', [ValidateIfFieldEqual('useFireblocksSigning', true, [])]),
            fireBlocksAssetId: new FormControl('', [ValidateIfFieldEqual('useFireblocksSigning', true, [])]),
            fireBlocksApiKey: new FormControl('', [ValidateIfFieldEqual('useFireblocksSigning', true, [])]),
            fireBlocksPrivateiKey: new FormControl('', [
                ValidateIfFieldEqual('useFireblocksSigning', true,
                    [
                        Validators.pattern(/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/gm)
                    ])])
        });
        this.didDocumentType = new FormControl(false, [Validators.required]);
        this.didDocumentForm = new FormControl('', [Validators.required]);
        this.didKeysForm = new FormGroup({});
        this.vcDocumentType = new FormControl(false, [Validators.required]);
        this.vcDocumentForm = new FormGroup({});

        this.fullForm = new FormGroup({});
        this.fullForm.addControl('standardRegistry', this.standardRegistryForm);
        this.fullForm.addControl('hederaCredentials', this.hederaCredentialsForm);
        this.fullForm.addControl('didDocumentType', this.didDocumentType);
        this.fullForm.addControl('didDocument', this.didDocumentForm);
        this.fullForm.addControl('didKeys', this.didKeysForm);
        this.fullForm.addControl('vcDocumentType', this.vcDocumentType);
        this.fullForm.addControl('vcDocument', this.vcDocumentForm);

        this.steps = [{
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
                this.changeStep(1);
            }
        },
        {
            label: 'Hedera Credentials',
            index: 1,
            visibility: () => {
                return true;
            },
            isFinish: () => {
                return false;
            },
            canNext: () => {
                return this.hederaCredentialsForm.valid;
            },
            next: () => {
                this.changeStep(2);
            }
        },
        {
            label: 'DID Document',
            index: 2,
            visibility: () => {
                return true;
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
                        this.changeStep(3);
                    });
                } else {
                    if (this.vcDocumentType.value) {
                        this.changeStep(4);
                    } else {
                        this.onSubmit();
                    }
                }
            }
        },
        {
            label: 'DID Document signing keys',
            index: 3,
            visibility: () => {
                return this.didDocumentType.value;
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
                        this.changeStep(4);
                    } else {
                        this.onSubmit();
                    }
                });
            }
        },
        {
            label: 'VC Document',
            index: 4,
            visibility: () => {
                return this.vcDocumentType.value;
            },
            isFinish: () => {
                return true;
            },
            canNext: () => {
                return this.vcDocumentForm.valid;
            },
            next: () => {
                this.onSubmit();
            }
        }];
    }

    ngOnInit() {
        this.loading = true;
        this.loadDate();
        this.update();
    }

    ngOnDestroy(): void {
        clearInterval(this.interval);
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
                        this.hederaCredentialsForm.patchValue({id, key});
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
            width: '65vw',
            closable: true,
            header: 'VC',
            data: {
                id: document.id,
                dryRun: !!document.dryRunId,
                document: document.document,
                title: title,
                type: 'VC',
                viewDocument: true,
            },
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public openDIDDocument(document: any, title: string) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            width: '65vw',
            closable: true,
            header: 'DID',
            data: {
                id: document.id,
                dryRun: !!document.dryRunId,
                document: document.document,
                title,
                type: 'JSON',
            },
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    private changeStep(step: number): void {
        this.currentStep = Math.min(Math.max(step, 0), this.steps.length);
    }

    public onPrev(): void {
        this.changeStep(this.currentStep - 1);
    }

    public onNext(): void {
        if (this.steps[this.currentStep]?.canNext()) {
            this.steps[this.currentStep].next();
        }
    }

    public canNext(): boolean {
        return this.steps[this.currentStep]?.canNext() || false;
    }

    public isFinish(): boolean {
        return this.steps[this.currentStep]?.isFinish() || false;
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
                        this.didKeysForm = new FormGroup({});
                        this.fullForm.removeControl('didKeys');
                        this.fullForm.addControl('didKeys', this.didKeysForm);

                        const names = Object.keys(result.keys);
                        for (const name of names) {
                            const keyNameControl = new FormControl('', [Validators.required]);
                            const keyValueControl = new FormControl('', [Validators.required]);
                            const keyControl = new FormGroup({
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

    private setErrors(form: FormControl | FormGroup, type?: string): void {
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
        const data = this.fullForm.value;
        const profile: any = {};
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
}
