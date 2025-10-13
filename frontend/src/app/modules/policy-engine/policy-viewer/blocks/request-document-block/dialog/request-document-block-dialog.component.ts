import { ChangeDetectorRef, Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RequestDocumentBlockComponent } from '../request-document-block.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { RequestDocumentBlockAddonComponent } from '../../request-document-block-addon/request-document-block-addon.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
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

    public minutesAgo$ = getMinutesAgoStream(() => this.lastSavedAt);
    private buttonNames: { [id: string]: string } = {
        save: "Save",
        cancel: "Cancel",
        prev: "Previous",
        next: "Next",
        submit: "Validate & Create"
    }

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private policyEngineService: PolicyEngineService,
        private schemaRulesService: SchemaRulesService,
        private fb: UntypedFormBuilder,
        private toastr: ToastrService,
        private changeDetectorRef: ChangeDetectorRef,
        private indexedDb: IndexedDbRegistryService,
        private tablePersist: TablePersistenceService,
    ) {
        this.parent = this.config.data;
        this.dataForm = this.fb.group({});
        this.storage = new DocumentAutosaveStorage(indexedDb);
        if (this.parent) {
            this.parent.dialog = this;
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
            .subscribe((rules: any[]) => {
                this.rules = new DocumentValidators(rules);
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
        if(this.dataForm.dirty && !this.dataSaved) {
            this.showUnsavedChangesDialog();
        } else {
            this.dialogRef.close(null);
        }
    }

    public async onSubmit(draft?: boolean) {
        if (this.disabled || this.loading) {
            return;
        }
        if (this.dataForm.valid || draft) {
            const data = this.dataForm.getRawValue();
            this.loading = true;

            await this.tablePersist.persistTablesInDocument(data, !!this.dryRun, this.policyId, this.id, draft);

            prepareVcData(data);
            const draftId = this.parent instanceof RequestDocumentBlockComponent ? this.parent.draftId : null;
            this.storage.delete(this.autosaveId);

            this.policyEngineService
                .setBlockData(this.id, this.policyId, {
                    document: data,
                    ref: this.docRef,
                    draft: draft,
                    draftId: draftId,
                })
                .subscribe(() => {
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
    }

    public showUnsavedChangesDialog() {
        if (!this.loading) {
                const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
                    showHeader: false,
                    width: '640px',
                    styleClass: 'guardian-dialog draft-dialog',
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
            data.onSubmit();
        }
    }

    public handleSaveBtnEvent($event: any, data: RequestDocumentBlockDialog) {
        if (!this.loading) {
            data.onSubmit(true);
        }
    }

    public onChangeButtons($event: any) {
        setTimeout(() => {
            this.buttons = [];
            if (Array.isArray($event)) {
                for (const item of $event) {
                    this.buttons.push({
                        ...item,
                        text: this.buttonNames[item.id] || item.text
                    })
                }
            }
        }, 0);
    }

    public ifDisabledBtn(config: any) {
        if (config.id === 'submit') {
            return !this.dataForm.valid || this.loading;
        } else {
            return false;
        }
    }

    public detectChanges() {
        this.changeDetectorRef.detectChanges();
    }
}
