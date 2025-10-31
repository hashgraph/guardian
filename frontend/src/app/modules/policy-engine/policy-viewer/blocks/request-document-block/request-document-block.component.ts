import { ChangeDetectorRef, Component, Input, OnInit, TemplateRef, ViewChild, } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { DocumentGenerator, DocumentValidators, ISchema, LocationType, Schema } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { AbstractUIBlockComponent } from '../models/abstract-ui-block.component';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { RequestDocumentBlockDialog } from './dialog/request-document-block-dialog.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { audit, finalize, takeUntil } from 'rxjs/operators';
import { interval, Subject, Subscription, firstValueFrom } from 'rxjs';
import { prepareVcData } from 'src/app/modules/common/models/prepare-vc-data';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { SavepointFlowService } from 'src/app/services/savepoint-flow.service';
import { DocumentAutosaveStorage } from '../../../structures';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { PolicyStatus } from '@guardian/interfaces';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';

interface IRequestDocumentData {
    readonly: boolean;
    schema: ISchema;
    active: boolean;
    presetSchema: any;
    presetFields: any[];
    restoreData: any;
    data: any;
    relayerAccount: boolean;
    draft: boolean;
    editType: 'new' | 'edit';
    uiMetaData: {
        type: string;
        title: string;
        description: string;
        content: string;
        privateFields: string[];
        buttonClass: string;
        dialogContent: string;
        dialogClass: string;
        hideWhenDiscontinued?: boolean;
    }
}

/**
 * Component for display block of 'requestVcDocument' types.
 */
@Component({
    selector: 'request-document-block',
    templateUrl: './request-document-block.component.html',
    styleUrls: ['./request-document-block.component.scss']
})
export class RequestDocumentBlockComponent
    extends AbstractUIBlockComponent<IRequestDocumentData>
    implements OnInit {

    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;
    @Input('dryRun') dryRun!: any;
    @Input('savepointIds') savepointIds?: string[] | null = null;
    @Input('policyStatus') policyStatus!: string;

    @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<any>;

    public isExist = false;
    public disabled = false;
    public schema: Schema | null;
    public dataForm: UntypedFormGroup;
    public hideFields: any;
    public type!: string;
    public content: any;
    public ref: any;
    public title: any;
    public description: any;
    public rowDocument: any;
    public needPreset: any;
    public presetDocument: any;
    public presetFields: any;
    public presetReadonlyFields: any;
    public dialogTitle: any;
    public dialogClass: any;
    public hideWhenDiscontinued: any;
    public dialogRef: any;
    public buttonClass: any;
    public restoreData: any;
    public rules: DocumentValidators;
    public rulesResults: any;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    public readonly: boolean = false;
    public draft: boolean;
    public relayerAccount: boolean;
    public draftId?: string;
    public dialog: RequestDocumentBlockDialog;
    public edit: boolean;
    private storage: DocumentAutosaveStorage;
    private stepper = [true, false, false];
    public relayerAccountType: string = 'account';
    public currentRelayerAccount: string;
    public relayerAccounts: any[] = [];
    public relayerAccountForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        account: new FormControl<string>('', Validators.required),
        key: new FormControl<string>('', Validators.required),
    });
    public submitText: string = 'Validate & Create';
    public isLocalUser: boolean = true;
    public remoteWarning: boolean = false;

    public get needRemoteWarning () {
        return !this.isLocalUser && this.relayerAccountType !== 'account';
    }

    public get isRemoteWarning() {
        return this.needRemoteWarning && !this.remoteWarning;
    }

    constructor(
        policyEngineService: PolicyEngineService,
        wsService: WebSocketService,
        profile: ProfileService,
        policyHelper: PolicyHelper,
        private schemaRulesService: SchemaRulesService,
        private relayerAccountsService: RelayerAccountsService,
        private fb: UntypedFormBuilder,
        private dialogService: DialogService,
        private router: Router,
        private changeDetectorRef: ChangeDetectorRef,
        private toastr: ToastrService,
        private savepointFlow: SavepointFlowService,
        private indexedDb: IndexedDbRegistryService,
        private tablePersist: TablePersistenceService,
    ) {
        super(policyEngineService, profile, wsService);
        this.dataForm = this.fb.group({});
        this.storage = new DocumentAutosaveStorage(indexedDb);
    }

    ngOnInit(): void {
        this.init();
        (window as any).__requestLast = this;
        (window as any).__request = (window as any).__request || {};
        (window as any).__request[this.id] = this;
        this.initForm(this.dataForm);
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
        this.destroy();
    }

    public __validate() {
        const errors: string[] = [];
        const dataForm = this.dialog?.dataForm || this.dataForm;
        this.__findError(dataForm, errors, '');
        console.log(errors);
    }

    private __findError(form: any, errors: any[], parent: string) {
        Object.keys(form.controls).forEach(key => {
            const control = form.get(key);
            if (control && !control.valid) {
                errors.push(`${parent}${key}`);
                if (control.controls) {
                    this.__findError(control, errors, `${parent}${key}.`);
                }
            }
        });
    }

    public initForm($event: any) {
        this.dataForm = $event;
        this.dataForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .pipe(audit(ev => interval(1000)))
            .subscribe(val => {
                this.validate();
            });
    }

    private validate() {
        if (!this.rules) {
            return;
        }
        const data = this.dataForm.getRawValue();
        this.rulesResults = this.rules.validateForm(this.schema?.iri, data);
    }

    protected override _onSuccess(data: any) {
        this.setData(data);
        if (this.type === 'dialog') {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else if (this.type === 'page') {
            this.loadRules();
        } else {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }
    }

    async showAutosaveDiag() {
        const autosaveId = this.getAutosaveId();
        const autosaveDocument = await this.storage.load(autosaveId);

        if (autosaveDocument) {
            this.showAutosaveDialog(autosaveDocument);
        }
    }

    override setData(data: IRequestDocumentData) {
        if (data) {
            const isDraft = data.data?.draft ?? false;


            this.isLocalUser = this.user.location === LocationType.LOCAL;
            this.readonly = !!data.readonly;
            const uiMetaData = data.uiMetaData;
            const row = data.data;
            const schema = data.schema;
            const active = data.active;
            this.ref = row;
            this.type = uiMetaData.type;
            this.edit = data.editType === 'edit';
            this.schema = new Schema(schema);
            this.hideFields = {};
            this.relayerAccount = !!data.relayerAccount && !this.dryRun;
            this.draft = isDraft;
            this.draftId = (isDraft && row) ? row.id : null;
            if (uiMetaData.privateFields) {
                for (
                    let index = 0;
                    index < uiMetaData.privateFields.length;
                    index++
                ) {
                    const field = uiMetaData.privateFields[index];
                    this.hideFields[field] = true;
                }
            }
            if (this.type == 'dialog') {
                this.content = uiMetaData.content;
                this.buttonClass = uiMetaData.buttonClass;
                this.dialogTitle = uiMetaData.dialogContent;
                this.dialogClass = uiMetaData.dialogClass;
                this.hideWhenDiscontinued = !!uiMetaData.hideWhenDiscontinued;
                this.description = uiMetaData.description;
            }
            if (this.type == 'page') {
                this.title = uiMetaData.title;
                this.description = uiMetaData.description;
            }
            this.disabled = active === false;
            this.isExist = true;
            this.needPreset = !!data.presetSchema;
            this.presetFields = data.presetFields || [];
            this.restoreData = data.restoreData;
            this.presetReadonlyFields = this.presetFields.filter(
                (item: any) => item.readonly && item.value
            );
            if (this.needPreset && row) {
                this.rowDocument = this.getJson(row, this.presetFields);
                this.preset(this.rowDocument);
            }
        } else {
            this.ref = null;
            this.schema = null;
            this.hideFields = null;
            this.disabled = false;
            this.isExist = false;
        }
        if (this.relayerAccount) {
            this.submitText = 'Select Relayer Account';
        } else {
            this.submitText = (this.edit && !this.draft) ? 'Validate & Update' : 'Validate & Create';
        }
    }

    isBtnVisible() {
        if (this.policyStatus === PolicyStatus.DISCONTINUED && this.hideWhenDiscontinued) {
            return false;
        }

        return true;
    }

    private loadRules() {
        this.schemaRulesService
            .getSchemaRuleData({
                policyId: this.policyId,
                schemaId: this.schema?.iri,
                parentId: this.ref?.id
            })
            .subscribe((rules) => {
                this.rules = new DocumentValidators(rules);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }


    private loadRelayerAccounts() {
        this.loading = true;
        this.relayerAccountsService
            .getRelayerAccountsAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe((relayerAccounts: any[]) => {
                this.relayerAccounts = relayerAccounts;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    private getJson(data: any, presetFields: any[]) {
        try {
            if (data) {
                const json: any = {};
                let cs: any = {};
                if (Array.isArray(data.document.credentialSubject)) {
                    cs = data.document.credentialSubject[0];
                } else {
                    cs = data.document.credentialSubject;
                }
                for (let i = 0; i < presetFields.length; i++) {
                    const f = presetFields[i];
                    if (f.value === 'username') {
                        json[f.name] = this.user.username;
                        continue;
                    }
                    if (f.value === 'hederaAccountId') {
                        json[f.name] = this.user.hederaAccountId;
                        continue;
                    }

                    json[f.name] = cs[f.value];
                }
                return json;
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    public async onStep(draft?: boolean) {
        if (this.disabled || this.loading) {
            return;
        }
        if (this.dataForm.valid || draft) {
            if (this.relayerAccount) {
                if (this.isStep(0)) {
                    this.setStep(1);
                    this.loadRelayerAccounts();
                } else {
                    await this.onSubmit(draft);
                }
            } else {
                await this.onSubmit(draft);
            }
        }
    }

    private getRelayerAccount() {
        if (this.relayerAccount) {
            if (this.relayerAccountType === 'account') {
                return null;
            } else if (this.relayerAccountType === 'relayerAccount') {
                return this.currentRelayerAccount;
            } else if (this.relayerAccountType === 'new') {
                return this.relayerAccountForm.value;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    private async onSubmit(draft?: boolean) {
        const data = this.dataForm.getRawValue();
        this.loading = true;
        this.storage.delete(this.getAutosaveId());

        await this.tablePersist.persistTablesInDocument(data, !!this.dryRun, this.policyId, this.id, draft);

        prepareVcData(data);

        let requestSucceeded = false;

        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                document: data,
                ref: this.ref,
                draft,
                draftId: this.draftId,
                relayerAccount: this.getRelayerAccount()
            })
            .pipe(
                finalize(async () => {
                    try {
                        if (!requestSucceeded) {
                            await this.tablePersist.rollbackIpfsUploads();
                        }
                    } finally {
                        this.loading = false;
                    }
                })
            )
            .subscribe(() => {
                requestSucceeded = true;

                setTimeout(() => {
                    this.loading = false;
                    if (!draft && this.dialogRef) {
                        this.dialogRef.close(null);

                    }
                }, 1000);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    public handleSaveBtnEvent($event: any) {
        if (!this.loading) {
            this.onStep(true);
        }
    }

    public preset(document: any) {
        this.presetDocument = document;
        this.changeDetectorRef.detectChanges();
        if (this.dialog) {
            this.dialog.detectChanges();
        }
    }

    public getRef() {
        if (!this.ref) {
            return null;
        }

        if (this.ref.draft) {
            return this.ref.draftRef;
        }

        return this.ref;
    }

    public getAutosaveId() {
        return this.ref?.id ?? `${this.policyId}_${this.id}_${this?.user?.id}`;
    }

    public async onDialogOpen() {
        const autosaveId = this.getAutosaveId();
        const autosaveDocument = await this.storage.load(autosaveId);

        if (autosaveDocument) {
            this.showAutosaveDialog(autosaveDocument);
        } else {
            this.onDialog();
        }

    }

    public onDialog() {
        if (this.needPreset && this.rowDocument) {
            this.preset(this.rowDocument);
        } else {
            this.presetDocument = null;
        }

        if (this.edit) {
            if (this.draft) {
                this.draftRestore();
            } else {
                this.updateRestore();
            }
        }

        this.showDocumentDialog();
    }

    private showDocumentDialog() {
        this.dialogRef = this.dialogService.open(RequestDocumentBlockDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog without-padding',
            data: this
        });

        this.dialogRef && this.dialogRef.onClose.subscribe(async (result: any) => { });
    }

    private showAutosaveDialog(autosaveDocument: string, callback?: any) {
        this.savepointFlow.markBusy();
        const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog draft-dialog',
            data: {
                header: 'Restore Autosave',
                text: 'An autosave was found. Do you want to restore it?',
                buttons: [{
                    name: 'Cancel',
                    class: 'secondary'
                },
                {
                    name: 'No',
                    class: 'primary'
                },
                {
                    name: 'Restore',
                    class: 'primary'
                }]
            },
        });

        dialogOptionRef.onClose.subscribe(async (result: string) => {
            if (result != 'Cancel') {

                if (result === 'Restore') {
                    this.preset(autosaveDocument);

                    await this.tablePersist.restoreTablesFromDraft(autosaveDocument);

                    this.savepointFlow.setSkipOnce();
                    if (this.type == 'dialog') {
                        this.showDocumentDialog();
                    }
                }
                else if (result === 'No' && this.type === 'dialog') {
                    this.onDialog();
                }


                if (callback) {
                    callback.call(this);
                }
            }

            this.savepointFlow.markReady();
        });
    }

    public draftRestore() {
        if (this.draft) {
            const draftDocument = Array.isArray(
                this.ref.document?.credentialSubject
            )
                ? this.ref.document.credentialSubject[0]
                : this.ref.document?.credentialSubject;

            if (draftDocument) {
                this.preset(draftDocument);
            }
        }
    }

    public updateRestore() {
        if (this.ref) {
            const document = Array.isArray(
                this.ref.document?.credentialSubject
            )
                ? this.ref.document.credentialSubject[0]
                : this.ref.document?.credentialSubject;

            if (document) {
                this.preset(document);
            }
        }
    }

    public onRestoreClick() {
        const presetDocument = Array.isArray(
            this.restoreData.document?.credentialSubject
        )
            ? this.restoreData.document.credentialSubject[0]
            : this.restoreData.document?.credentialSubject;
        if (presetDocument) {
            this.preset(presetDocument);
        }
        this.restoreData = null;
    }

    public onDryRun() {
        if (this.schema) {
            const presetDocument = DocumentGenerator.generateDocument(this.schema, undefined, this.rowDocument);
            this.preset(presetDocument);
        }
    }

    public onCancelPage(value: boolean) {
        this.router.navigate(['/policy-viewer']);
    }

    public onChangeButtons($event: any) {
        if (Array.isArray($event)) {
            for (const item of $event) {
                if (item.id === 'submit') {
                    item.disabled = () => {
                        return !this.dataForm.valid || this.loading;
                    }
                }
            }
        }
    }

    public isStep(index: number) {
        return this.stepper[index];
    }

    public setStep(index: number) {
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = false;
        }
        this.stepper[index] = true;
    }

    public isActionStep(index: number): boolean {
        return this.stepper[index];
    }

    public onGenerateRelayerAccount() {
        this.loading = true;
        this.relayerAccountsService
            .generateRelayerAccount()
            .subscribe((account) => {
                const data = this.relayerAccountForm.value;
                this.relayerAccountForm.setValue({
                    name: data.name || '',
                    account: account.id || '',
                    key: account.key || ''
                })
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }

    public ifRelayerAccountDisabled() {
        if (this.relayerAccount) {
            if (this.isStep(1)) {
                if (this.relayerAccountType === 'account') {
                    return false;
                } else if (this.relayerAccountType === 'relayerAccount') {
                    return !this.currentRelayerAccount;
                } else if (this.relayerAccountType === 'new') {
                    return this.relayerAccountForm.invalid;
                } else {
                    return null;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public ifDisabledBtn() {
        return !this.dataForm.valid || this.loading || this.ifRelayerAccountDisabled() || this.isRemoteWarning;
    }
}
