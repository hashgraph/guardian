import { ChangeDetectorRef, Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RequestDocumentBlockComponent } from '../request-document-block.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { RequestDocumentBlockAddonComponent } from '../../request-document-block-addon/request-document-block-addon.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { audit, takeUntil } from 'rxjs/operators';
import { interval, Subject } from 'rxjs';
import { prepareVcData } from 'src/app/modules/common/models/prepare-vc-data';
import { DocumentValidators } from '@guardian/interfaces';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';

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

    public buttons: any = [];
    public rules: DocumentValidators;
    public dataForm: UntypedFormGroup;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    public rulesResults: any;

    private buttonNames: { [id: string]: string } = {
        save: "Save",
        cancel: "Cancel",
        prev: "Previous",
        next: "Next",
        submit: "Create"
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
    ) {
        this.parent = this.config.data;
        this.dataForm = this.fb.group({});
        if (this.parent) {
            this.parent.dialog = this;
        }
    }

    ngOnInit() {
        this.loading = true;
        this.loadRules();
        this.initForm(this.dataForm);
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
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
        this.dialogRef.close(null);
    }

    public onSubmit(draft?: boolean) {
        if (this.disabled || this.loading) {
            return;
        }
        if (this.dataForm.valid || draft) {
            const data = this.dataForm.getRawValue();
            this.loading = true;
            prepareVcData(data);
            this.policyEngineService
                .setBlockData(this.id, this.policyId, {
                    document: data,
                    ref: this.docRef,
                    draft,
                })
                .subscribe(() => {
                    setTimeout(() => {
                        this.loading = false;
                        if (draft && this.parent instanceof RequestDocumentBlockComponent) {
                            this.parent.draftDocument = {
                                policyId: this.parent.policyId,
                                user: this.parent.user.did,
                                blockId: this.parent.id,
                                data
                            };

                            this.toastr.success('The draft version of the document was saved successfully', '', {
                                timeOut: 3000,
                                closeButton: true,
                                positionClass: 'toast-bottom-right',
                                enableHtml: true,
                            });
                        }

                        this.dialogRef.close(null);
                    }, 1000);
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
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
            if (this.parent instanceof RequestDocumentBlockComponent && this.parent.draftDocument) {
                const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
                    showHeader: false,
                    width: '640px',
                    styleClass: 'guardian-dialog draft-dialog',
                    data: {
                        header: 'Overwrite Old Draft',
                        text: 'You already have a saved draft. Are you sure you want to overwrite it? \n Please note that saving a new draft will permanently delete the previous one.',
                        buttons: [{
                            name: 'Cancel',
                            class: 'secondary'
                        }, {
                            name: 'Save Draft',
                            class: 'primary'
                        }]
                    },
                });

                dialogOptionRef.onClose.subscribe((result: string) => {
                    if (result == 'Save Draft') {
                        data.onSubmit(true);
                    }
                });
            } else {
                data.onSubmit(true);
            }
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
