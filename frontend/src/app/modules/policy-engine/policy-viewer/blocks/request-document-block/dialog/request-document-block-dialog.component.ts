import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RequestDocumentBlockComponent } from '../request-document-block.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { RequestDocumentBlockAddonComponent } from '../../request-document-block-addon/request-document-block-addon.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { audit, takeUntil } from 'rxjs/operators';
import { interval, Subject, Subscription } from 'rxjs';
import { prepareVcData } from 'src/app/modules/common/models/prepare-vc-data';
import { DocumentValidators } from '@guardian/interfaces';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { DocumentAutosaveStorage } from 'src/app/modules/policy-engine/structures';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { autosaveValueChanged, getMinutesAgoStream } from 'src/app/utils/autosave-utils';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';
import { AttachedFile } from 'src/app/modules/common/policy-comments/attached-file';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyTestAutomationService } from '../../../policy-test-automation/policy-test-automation.service';

@Component({
    selector: 'request-document-block-dialog',
    templateUrl: './request-document-block-dialog.component.html',
    styleUrls: ['./request-document-block-dialog.component.scss'],
})
export class RequestDocumentBlockDialog {
    public loading: boolean = true;
    public parent: RequestDocumentBlockComponent | RequestDocumentBlockAddonComponent;

    public get id() { return this.parent?.id; }
    public get dryRun() { return this.parent?.dryRun; }
    public get restoreData() { return this.parent?.restoreData; }
    public get dialogTitle() { return this.parent?.dialogTitle; }
    public get schema() { return this.parent?.schema; }
    public get hideFields() { return this.parent?.hideFields; }
    public get presetDocument() { return this.parent?.presetDocument; }
    public get presetReadonlyFields() { return this.parent?.presetReadonlyFields; }
    public get policyId() { return this.parent?.policyId; }
    public get disabled() { return this.parent?.disabled; }
    public get docRef() { return this.parent?.getRef(); }
    public get autosaveId() { return this.parent?.getAutosaveId(); }
    public get edit() { return this.parent?.edit; }
    public get draft() { return this.parent?.draft; }
    public get relayerAccount() { return this.parent?.relayerAccount; }
    public get user() { return this.parent?.user; }
    public get isLocalUser() { return this.parent?.isLocalUser; }

    public buttons: any = [];
    public rules: DocumentValidators;
    public dataForm: UntypedFormGroup;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    public rulesResults: any;
    public lastSavedAt?: Date;
    private storage: DocumentAutosaveStorage;
    private sub?: Subscription;
    private readonly AUTOSAVE_INTERVAL = 120000;
    private dataSaved: boolean = false;
    private stepper = [true, false, false];
    public relayerAccountType: string = 'account';
    public currentRelayerAccount: string;
    public relayerAccounts: any[] = [];
    public remoteWarning: boolean = false;

    public enableAdditionalData: boolean = false;
    public evidenceText: string = '';
    public evidenceFiles: AttachedFile[] = [];
    private _evidenceFileMap = new WeakMap<AttachedFile, File>();

    public get isEvidenceUploading(): boolean {
        return this.evidenceFiles.some(f => !f.loaded && !f.error);
    }

    public get evidenceStepIndex(): number {
        return 1;
    }

    public minutesAgo$ = getMinutesAgoStream(() => this.lastSavedAt);
    private buttonNames: { [id: string]: string } = {
        save: 'Save Draft',
        cancel: 'Cancel',
        prev: 'Previous',
        next: 'Next',
        relayerAccount: 'Select Relayer Account',
        submit: 'Validate & Create'
    }

    public relayerAccountForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        account: new FormControl<string>('', Validators.required),
        key: new FormControl<string>('', Validators.required),
    });

    public get needRemoteWarning() {
        return !this.isLocalUser && this.relayerAccountType !== 'account';
    }

    public get isRemoteWarning() {
        return this.needRemoteWarning && !this.remoteWarning;
    }

    public isLargeSize: boolean = true;
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;
        
    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private policyEngineService: PolicyEngineService,
        private schemaRulesService: SchemaRulesService,
        private relayerAccountsService: RelayerAccountsService,
        private fb: UntypedFormBuilder,
        private toastr: ToastrService,
        private changeDetectorRef: ChangeDetectorRef,
        private indexedDb: IndexedDbRegistryService,
        private tablePersist: TablePersistenceService,
        private ipfsService: IPFSService,
        private policyTest: PolicyTestAutomationService,
    ) {
        this.parent = this.config.data;
        this.dataForm = this.fb.group({});
        this.storage = new DocumentAutosaveStorage(indexedDb);
        if (this.parent) {
            this.parent.dialog = this;
            this.enableAdditionalData = !!(this.parent as any).enableAdditionalData;
        }
    }

    ngOnInit() {
        this.loading = true;
        this.loadRules();
        this.initForm(this.dataForm);
        this.sub = interval(this.AUTOSAVE_INTERVAL).subscribe(async () => {
            const data = this.dataForm.getRawValue();
            const savedData = await this.storage.load(this.autosaveId);
            const saveNeeded = await autosaveValueChanged(data, savedData);

            if (saveNeeded) {
                this.storage.save(this.autosaveId, data);
                this.lastSavedAt = new Date();
            }
        });
        this.buttonNames['submit'] = (this.edit && !this.draft) ? 'Validate & Update' : 'Validate & Create';
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
        this.sub?.unsubscribe();
    }

    public initForm($event: any) {
        this.dataForm = $event;
        this.dataForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .pipe(audit(ev => interval(1000)))
            .subscribe(val => {
                this.validate();
                this.dataSaved = false;
            });
    }

    private loadRules() {
        this.schemaRulesService
            .getSchemaRuleData({
                policyId: this.policyId,
                schemaId: this.schema?.iri,
                parentId: this.docRef?.id
            })
            .pipe(takeUntil(this.destroy$))
            .subscribe((rules: any[]) => {
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

    private validate() {
        if (!this.rules) {
            return;
        }
        const data = this.dataForm.getRawValue();
        this.rulesResults = this.rules.validateForm(this.schema?.iri, data);
    }

    public onClose(): void {
        if (this.dataForm.dirty && !this.dataSaved) {
            this.showUnsavedChangesDialog();
        } else {
            this.dialogRef.close(null);
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

    public onEvidenceDrop($event: DragEvent) {
        $event.preventDefault();
        const files = $event.dataTransfer?.files;
        if (files?.length) {
            this.addEvidenceFiles(Array.from(files));
        }
    }

    public onEvidenceAttach($event: any) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e: any) => {
            const files: File[] = Array.from(e.target.files || []);
            if (files.length) {
                this.addEvidenceFiles(files);
            }
        };
        input.click();
    }

    public onDeleteEvidenceFile(file: AttachedFile) {
        const index = this.evidenceFiles.indexOf(file);
        if (index !== -1) {
            this.evidenceFiles.splice(index, 1);
            this._evidenceFileMap.delete(file);
        }
    }

    private addEvidenceFiles(files: File[]) {
        for (const rawFile of files) {
            if (this.evidenceFiles.some(f => this._evidenceFileMap.get(f)?.name === rawFile.name)) {
                continue;
            }
            const af = AttachedFile.fromFile('', '', '', rawFile);
            this._evidenceFileMap.set(af, rawFile);
            this.evidenceFiles.push(af);
            this.ipfsService.addFile(rawFile).subscribe((cid: string) => {
                af.cid = cid;
                af.link = 'ipfs://' + cid;
                af.loaded = true;
            }, () => {
                af.error = true;
            });
        }
    }

    private buildEvidence(): Array<{ dataType: 'message' | 'file'; data: string }> {
        const entries: Array<{ dataType: 'message' | 'file'; data: string }> = [];
        if (this.evidenceText?.trim()) {
            entries.push({ dataType: 'message', data: this.evidenceText.trim() });
        }
        for (const file of this.evidenceFiles.filter(f => f.loaded && !f.error)) {
            entries.push({ dataType: 'file', data: file.link });
        }
        return entries;
    }

    private async onSubmit(draft?: boolean) {
        const data = this.dataForm.getRawValue();
        this.loading = true;

        await this.tablePersist.persistTablesInDocument(data, !!this.dryRun, this.policyId, this.id, draft);

        prepareVcData(data);
        const draftId = this.parent instanceof RequestDocumentBlockComponent ? this.parent.draftId : null;
        this.storage.delete(this.autosaveId);

        const evidence = this.enableAdditionalData ? this.buildEvidence() : undefined;

        const payload = {
            document: data,
            ref: this.docRef,
            draft,
            draftId,
            relayerAccount: this.getRelayerAccount(),
            ...(evidence?.length ? { evidence } : {})
        };

        const captureOutput = this.dryRun && !draft && this.policyTest.state.captureNextFormSubmit;

        this.policyEngineService
            .setBlockDataWithResult(this.id, this.policyId, payload)
            .subscribe((result) => {
                if (captureOutput) {
                    this.policyTest.captureTestCase({
                        policyId: this.policyId,
                        blockId: this.id,
                        blockType: 'requestDocumentBlock',
                        ...payload,
                        result: result?.result || result?.response
                    });
                }
                setTimeout(() => {
                    this.loading = false;
                    if (!draft) {
                        this.dialogRef.close(null);
                    } else {
                        this.dataSaved = true;
                    }
                }, 1000);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    public async onStep(draft?: boolean) {
        if (this.disabled || this.loading) {
            return;
        }
        if (this.dataForm.valid || draft) {
            if (this.enableAdditionalData && this.isStep(0)) {
                this.setStep(1);
            } else if (this.enableAdditionalData && this.isStep(1) && this.relayerAccount) {
                this.setStep(2);
                this.loadRelayerAccounts();
            } else if (!this.enableAdditionalData && this.relayerAccount && this.isStep(0)) {
                this.setStep(1);
                this.loadRelayerAccounts();
            } else {
                await this.onSubmit(draft);
            }
        }
    }

    public showUnsavedChangesDialog() {
        if (!this.loading) {
            const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog without-saving-dialog',
                data: {
                    header: 'Leave without saving?',
                    text: 'You’re trying to leave the page without saving your changes. \n\nAre you sure you want to discard them and exit the creation process?',
                    buttons: [{
                        name: 'Close',
                        class: 'secondary'
                    }, {
                        name: 'Confirm',
                        class: 'primary'
                    }]
                },
            });

            dialogOptionRef.onClose.subscribe((result: string) => {
                if (result == 'Confirm') {
                    this.dialogRef.close(null);
                }
            });
        }
    }

    public onDryRun() {
        this.parent.onDryRun();
    }

    public onRestoreClick() {
        this.parent.onRestoreClick();
    }

    public handleCancelBtnEvent($event: any, data: RequestDocumentBlockDialog) {
        data.onClose();
    }

    public handleSubmitBtnEvent($event: any, data: RequestDocumentBlockDialog) {
        if (data.dataForm.valid || !this.loading) {
            data.onStep();
        }
    }

    public handleSaveBtnEvent($event: any, data: RequestDocumentBlockDialog) {
        if (!this.loading) {
            data.onStep(true);
        }
    }

    public getButtonName(item: any) {
        if (item.id === 'submit') {
            if (this.enableAdditionalData && this.isStep(0)) {
                return 'Add Evidence Attachments';
            } else if (this.relayerAccount && (this.isStep(this.enableAdditionalData ? 1 : 0))) {
                return this.buttonNames['relayerAccount'];
            }
        }
        return this.buttonNames[item.id] || item.text;
    }

    public onChangeButtons($event: any) {
        setTimeout(() => {
            this.buttons = [];
            if (Array.isArray($event)) {
                for (const item of $event) {
                    this.buttons.push({ ...item });
                }
            }
        }, 0);
    }

    public ifRelayerAccountDisabled() {
        if (this.relayerAccount) {
            const relayerStep = this.enableAdditionalData ? 2 : 1;
            if (this.isStep(relayerStep)) {
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

    public ifDisabledBtn(config: any) {
        if (config.id === 'submit') {
            return !this.dataForm.valid || this.loading || this.ifRelayerAccountDisabled() || this.isRemoteWarning;
        } else {
            return false;
        }
    }

    public detectChanges() {
        this.changeDetectorRef.detectChanges();
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

    public toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
