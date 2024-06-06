import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from '../../services/profile.service';
import { SchemaService } from '../../services/schema.service';
import { IUser, Schema, SchemaEntity } from '@guardian/interfaces';
import { DemoService } from '../../services/demo.service';
import { VCViewerDialog } from '../../modules/schema-engine/vc-dialog/vc-dialog.component';
import { HeaderPropsService } from '../../services/header-props.service';
import { InformService } from '../../services/inform.service';
import { TasksService } from '../../services/tasks.service';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { ValidateIfFieldEqual } from '../../validators/validate-if-field-equal';

enum OperationMode {
    None,
    Generate,
    GetAllUserTopics,
}

/**
 * Standard Registry profile settings page.
 */
@Component({
    selector: 'app-root-profile',
    templateUrl: './root-profile.component.html',
    styleUrls: ['./root-profile.component.scss'],
})
export class RootProfileComponent implements OnInit, OnDestroy{
    @ViewChild('actionMenu') actionMenu: any;

    public loading: boolean = true;
    public taskId: string | undefined = undefined;
    public isConfirmed: boolean = false;
    public profile: IUser | null;
    public balance: string | null;
    public errorLoadSchema: boolean = false;
    public isFailed: boolean = false;
    public isNewAccount: boolean = true;
    public progress: number = 0;
    public userTopics: any[] = [];
    public schema!: Schema;
    public hederaForm = this.fb.group({
        hederaAccountId: ['', Validators.required],
        hederaAccountKey: ['', Validators.required],
        useFireblocksSigning: [false],
        fireBlocksVaultId: ['', [ValidateIfFieldEqual('useFireblocksSigning', true, [Validators.required])]],
        fireBlocksAssetId: ['', [ValidateIfFieldEqual('useFireblocksSigning', true, [Validators.required])]],
        fireBlocksApiKey: ['', [ValidateIfFieldEqual('useFireblocksSigning', true, [Validators.required])]],
        fireBlocksPrivateiKey: [
            '', ValidateIfFieldEqual('useFireblocksSigning', true,
                [
                    Validators.required,
                    Validators.pattern(/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/gm)
                ])]
    });
    public selectedTokenId = new FormControl(null, Validators.required);
    public vcForm = new FormGroup({});
    public didDocumentForm = new FormControl(null, Validators.required);
    public didDocumentType = new FormControl(false, Validators.required);
    public didKeys: any[] = [];
    public didKeysControl = new FormGroup({});
    public hidePrivateFields = {
        id: true
    };
    public validVC: boolean = false;

    public step: 'HEDERA' | 'RESTORE' | 'DID' | 'DID_KEYS' | 'VC' = 'HEDERA';

    private operationMode: OperationMode = OperationMode.None;
    private expectedTaskMessages: number = 0;
    private subscriptions = new Subscription()
    public isRestore = false;

    constructor(
        private router: Router,
        private auth: AuthService,
        private fb: FormBuilder,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private otherService: DemoService,
        private informService: InformService,
        private taskService: TasksService,
        private headerProps: HeaderPropsService,
        public dialog: DialogService,
        private cdRef: ChangeDetectorRef
    ) {
        console.log(this);
        this.profile = null;
        this.balance = null;
        this.vcForm.statusChanges.subscribe((result) => {
            setTimeout(() => {
                this.validVC = result == 'VALID';
            });
        });
    }

    ngOnInit() {
        this.loading = true;
        this.hederaForm.setValue({
            hederaAccountId: '',
            hederaAccountKey: '',
            useFireblocksSigning: false,
            fireBlocksVaultId: '',
            fireBlocksAssetId: '',
            fireBlocksApiKey: '',
            fireBlocksPrivateiKey: ''
        });
        this.vcForm.setValue({});
        this.loadProfile();
        this.step = 'HEDERA';
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    private loadProfile() {
        this.loading = true;
        this.profile = null;
        this.balance = null;

        forkJoin([
            this.profileService.getProfile(),
            this.profileService.getBalance(),
            this.schemaService.getSystemSchemasByEntity(SchemaEntity.STANDARD_REGISTRY)
        ]).subscribe(
            ([profile, balance, schema]) => {
                if (!schema) {
                    this.errorLoadSchema = true;
                    this.loading = false;
                    this.headerProps.setLoading(false);
                    return;
                }

                this.isConfirmed = !!profile.confirmed;
                this.isFailed = !!profile.failed;
                this.isNewAccount = !!!profile.didDocument;

                if (this.isConfirmed) {
                    this.balance = balance;
                    this.profile = profile;
                }

                if (schema) {
                    this.schema = new Schema(schema);
                }

                setTimeout(() => {
                    this.loading = false;
                    this.headerProps.setLoading(false);
                }, 500);
            },
            ({ message }) => {
                this.loading = false;
                this.headerProps.setLoading(false);
                console.error(message);
            }
        );
    }

    private prepareDataFrom(data: any) {
        if (Array.isArray(data)) {
            for (let j = 0; j < data.length; j++) {
                let dataArrayElem = data[j];
                if (dataArrayElem === '' || dataArrayElem === null) {
                    data.splice(j, 1);
                    j--;
                }
                if (
                    Object.getPrototypeOf(dataArrayElem) === Object.prototype ||
                    Array.isArray(dataArrayElem)
                ) {
                    this.prepareDataFrom(dataArrayElem);
                }
            }
        }

        if (Object.getPrototypeOf(data) === Object.prototype) {
            let dataKeys = Object.keys(data);
            for (let i = 0; i < dataKeys.length; i++) {
                const dataElem = data[dataKeys[i]];
                if (dataElem === '' || dataElem === null) {
                    delete data[dataKeys[i]];
                }
                if (
                    Object.getPrototypeOf(dataElem) === Object.prototype ||
                    Array.isArray(dataElem)
                ) {
                    this.prepareDataFrom(dataElem);
                }
            }
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
        // form.setValue('');
    }

    public parseDidDocument() {
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
                        this.didKeysControl = new FormGroup({});
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
                            this.didKeysControl.addControl(name, keyControl);
                            this.didKeys.push({
                                name,
                                keyNameControl,
                                keyValueControl,
                                keyNames
                            })
                        }
                        this.onNextStep();
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

    public parseDidKeys() {
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
                            this.onNextStep()
                        } else {
                            this.setErrors(this.didKeysControl, 'incorrect');
                        }
                        this.cdRef.detectChanges();
                        this.loading = false;
                    },
                    (e) => {
                        this.setErrors(this.didKeysControl, 'incorrect');
                        this.loading = false;
                    }
                );
        } catch (error) {
            this.setErrors(this.didKeysControl, 'incorrect');
            this.loading = false;
        }
    }

    public onPrevStep() {
        switch (this.step) {
            case 'HEDERA': {
                this.step = 'HEDERA';
                this.isRestore = false;
                break;
            }
            case 'DID': {
                this.step = 'HEDERA';
                this.isRestore = false;
                break;
            }
            case 'DID_KEYS': {
                this.step = 'DID';
                break;
            }
            case 'VC': {
                if (this.didDocumentType.value) {
                    this.step = 'DID_KEYS';
                } else {
                    this.step = 'DID';
                }
                break;
            }
            case 'RESTORE': {
                if (this.didDocumentType.value) {
                    this.step = 'DID_KEYS';
                } else {
                    this.step = 'DID';
                }
                break;
            }
            default: {
                this.step = 'HEDERA';
                this.isRestore = false;
                break;
            }
        }
    }

    public onNextStep() {
        switch (this.step) {
            case 'HEDERA': {
                if (this.hederaForm.valid) {
                    this.step = 'DID';
                }
                break;
            }
            case 'DID': {
                if (this.didDocumentType.value) {
                    if (this.didDocumentForm.valid) {
                        this.step = 'DID_KEYS';
                    }
                } else {
                    if (this.isRestore) {
                        this.userTopics = [];
                        this.selectedTokenId.setValue('');
                        this.step = 'RESTORE';
                    } else {
                        this.step = 'VC';
                    }
                }
                break;
            }
            case 'DID_KEYS': {
                if (this.didKeysControl.valid) {
                    if (this.isRestore) {
                        this.userTopics = [];
                        this.selectedTokenId.setValue('');
                        this.step = 'RESTORE';
                    } else {
                        this.step = 'VC';
                    }
                }
                break;
            }
            case 'VC': {
                if (this.validVC) {
                    this.onSubmit();
                }
                break;
            }
            case 'RESTORE': {
                if (this.selectedTokenId.valid) {
                    this.onRestore()
                }
                break;
            }
            default: {
                this.step = 'HEDERA';
                break;
            }
        }
    }

    public onRestoreStep() {
        if (this.hederaForm.valid) {
            this.isRestore = true;
            this.step = 'DID';
        }
    }

    public onChangeDidType() {
        if (!this.didDocumentType.value) {
            this.didDocumentForm.reset();
        }
    }

    public onChangeForm() {
        this.vcForm.updateValueAndValidity();
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
            this.taskService.get(taskId).subscribe(
                (task) => {
                    switch (operationMode) {
                        case OperationMode.Generate: {
                            const { id, key } = task.result;
                            this.hederaForm.patchValue({
                                hederaAccountId: id,
                                hederaAccountKey: key,
                            });
                            this.loading = false;
                            break;
                        }
                        case OperationMode.GetAllUserTopics: {
                            this.userTopics = task.result
                                .sort((a: any, b: any) => {
                                    return b.timestamp - a.timestamp;
                                })
                                .map((i: any) => {
                                    return {
                                        topicId: i.topicId,
                                        date: new Date(
                                            i.timestamp
                                        ).toLocaleString(),
                                    };
                                });
                            this.loadProfile();
                            this.selectedTokenId.setValue(
                                this.userTopics && this.userTopics.length
                                    ? this.userTopics[0].topicId
                                    : undefined
                            );
                            break;
                        }
                    }
                },
                (e) => {
                    this.loading = false;
                }
            );
        }
    }

    public randomKey() {
        this.loading = true;
        this.otherService.pushGetRandomKey().subscribe(
            (result) => {
                const { taskId, expectation } = result;
                this.taskId = taskId;
                this.expectedTaskMessages = expectation;
                this.operationMode = OperationMode.Generate;
            },
            (e) => {
                this.loading = false;
                this.taskId = undefined;
            }
        );
    }

    public getAllUserTopics(event: any) {
        event.stopPropagation();
        event.preventDefault();

        if (this.hederaForm.invalid) {
            return;
        }

        const hederaForm = this.hederaForm.value;
        const didDocument = this.didDocumentType.value
            ? this.didDocumentForm.value
            : null;

        const data = {
            hederaAccountId: hederaForm.hederaAccountId?.trim(),
            hederaAccountKey: hederaForm.hederaAccountKey?.trim(),
            didDocument: JSON.parse(didDocument),
        };
        this.loading = true;
        this.profileService.getAllUserTopics(data).subscribe(
            (result) => {
                const { taskId, expectation } = result;
                this.taskId = taskId;
                this.expectedTaskMessages = expectation;
                this.operationMode = OperationMode.GetAllUserTopics;
            },
            (e) => {
                this.loading = false;
                this.taskId = undefined;
            }
        );
    }

    public retry() {
        this.isConfirmed = false;
        this.isFailed = false;
        this.isNewAccount = true;
    }

    public onSubmit() {
        if (this.hederaForm.valid && this.vcForm.valid) {
            const hederaForm = this.hederaForm.value;
            const vcDocument = this.vcForm.value;
            const didDocument = this.didDocumentType.value ?
                this.didDocumentForm.value : null;
            const didKeys: any[] = [];
            for (const didKey of this.didKeys) {
                didKeys.push({
                    id: didKey.keyNameControl.value,
                    key: didKey.keyValueControl.value
                })
            }
            this.prepareDataFrom(vcDocument);
            const data: any = {
                hederaAccountId: hederaForm.hederaAccountId?.trim(),
                hederaAccountKey: hederaForm.hederaAccountKey?.trim(),
                vcDocument,
                didDocument: JSON.parse(didDocument),
                useFireblocksSigning: hederaForm.useFireblocksSigning,
                fireblocksConfig: {
                    fireBlocksVaultId: hederaForm.fireBlocksVaultId,
                    fireBlocksAssetId: hederaForm.fireBlocksAssetId,
                    fireBlocksApiKey: hederaForm.fireBlocksApiKey,
                    fireBlocksPrivateiKey: hederaForm.fireBlocksPrivateiKey
                },
                didKeys
            };
            this.loading = true;
            this.headerProps.setLoading(true);
            this.profileService.pushSetProfile(data).subscribe(
                (result) => {
                    const { taskId, expectation } = result;
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

    public onRestore() {
        const topicId = this.selectedTokenId.value;
        const hederaForm = this.hederaForm.value;
        const didDocument = this.didDocumentType.value
            ? this.didDocumentForm.value
            : null;
        const didKeys: any[] = [];
        for (const didKey of this.didKeys) {
            didKeys.push({
                id: didKey.keyNameControl.value,
                key: didKey.keyValueControl.value
            })
        }
        const data: any = {
            topicId,
            hederaAccountId: hederaForm.hederaAccountId?.trim(),
            hederaAccountKey: hederaForm.hederaAccountKey?.trim(),
            didDocument: JSON.parse(didDocument),
            didKeys
        };

        this.loading = true;
        this.headerProps.setLoading(true);

        this.profileService
            .restoreProfile(data)
            .subscribe(
                (result) => {
                    const { taskId, expectation } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href),
                        },
                    });
                },
                (e) => {
                    this.loading = false;
                    this.taskId = undefined;
                }
            );
    }

    public openVCDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '65vw',
            closable: true,
            header: 'VC',
            data: {
                id: document.id,
                dryRun: !!document.dryRunId,
                document: document.document,
                title,
                type: 'VC',
                viewDocument: true,
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    public openDIDDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
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

        dialogRef.onClose.subscribe(async (result) => {
        });
    }
}
