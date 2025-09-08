import { ChangeDetectorRef, Component, Input, OnInit, TemplateRef, ViewChild, } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { DocumentGenerator, DocumentValidators, ISchema, Schema } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { AbstractUIBlockComponent } from '../models/abstract-ui-block.component';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { RequestDocumentBlockDialog } from './dialog/request-document-block-dialog.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { audit, takeUntil } from 'rxjs/operators';
import { interval, Subject } from 'rxjs';
import { prepareVcData } from 'src/app/modules/common/models/prepare-vc-data';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { MergeUtils } from 'src/app/utils';
import { ToastrService } from 'ngx-toastr';

interface IRequestDocumentData {
    readonly: boolean;
    schema: ISchema;
    active: boolean;
    presetSchema: any;
    presetFields: any[];
    restoreData: any;
    data: any;
    draftDocument: any;
    uiMetaData: {
        type: string;
        title: string;
        description: string;
        content: string;
        privateFields: string[];
        buttonClass: string;
        dialogContent: string;
        dialogClass: string;
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

    @ViewChild("dialogTemplate") dialogTemplate!: TemplateRef<any>;

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
    public dialogRef: any;
    public buttonClass: any;
    public restoreData: any;
    public rules: DocumentValidators;
    public rulesResults: any;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    public readonly: boolean = false;
    public draftDocument: any;
    public dialog: RequestDocumentBlockDialog;

    constructor(
        policyEngineService: PolicyEngineService,
        wsService: WebSocketService,
        profile: ProfileService,
        policyHelper: PolicyHelper,
        private schemaRulesService: SchemaRulesService,
        private fb: UntypedFormBuilder,
        private dialogService: DialogService,
        private router: Router,
        private changeDetectorRef: ChangeDetectorRef,
        private toastr: ToastrService
    ) {
        super(policyEngineService, profile, wsService);
        this.dataForm = this.fb.group({});
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
            this.draftDocument && this.showDraftDialog();
        } else {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }
    }

    override setData(data: IRequestDocumentData) {
        if (data) {
            this.readonly = !!data.readonly;
            const uiMetaData = data.uiMetaData;
            const row = data.data;
            const schema = data.schema;
            const active = data.active;
            this.ref = row;
            this.type = uiMetaData.type;
            this.schema = new Schema(schema);
            this.hideFields = {};
            this.draftDocument = data.draftDocument;
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
                    ref: this.ref,
                    draft
                })
                .subscribe(() => {
                    setTimeout(() => {
                        this.loading = false;
                        if (draft) {
                            this.draftDocument = {
                                policyId: this.policyId,
                                user: this.user.did,
                                blockId: this.id,
                                data
                            };

                            this.toastr.success('The draft version of the document was saved successfully', '', {
                                timeOut: 3000,
                                closeButton: true,
                                positionClass: 'toast-bottom-right',
                                enableHtml: true,
                            });
                        }
                    }, 1000);
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
        }
    }

    public handleSaveBtnEvent($event: any) {
        if (!this.loading) {
            if (this.draftDocument) {
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
                        this.onSubmit(true);
                    }
                });
            } else {
                this.onSubmit(true);
            }
        }
    }

    public preset(document: any) {
        this.presetDocument = document;
        this.changeDetectorRef.detectChanges();
        if(this.dialog) {
            this.dialog.detectChanges();
        }
    }

    public getRef() {
        return this.ref;
    }

    public onDialog() {
        if (this.needPreset && this.rowDocument) {
            this.preset(this.rowDocument);
        } else {
            this.presetDocument = null;
        }

        if (this.draftDocument) {
            this.showDraftDialog(this.showDocumentDialog);
        } else {
            this.showDocumentDialog();
        }
    }

    private showDocumentDialog() {
        const dialogRef = this.dialogService.open(RequestDocumentBlockDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: this
        });

        dialogRef && dialogRef.onClose.subscribe(async (result) => { });
    }

    private showDraftDialog(callback?: any) {
        const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog draft-dialog',
            data: {
                header: 'Open Existing Draft',
                text: 'You have previously saved draft. Do you want to continue with editing it or create completely new one? \n\n Remember that after saving new draft, previous one will be deleted.',
                buttons: [{
                    name: 'Cancel',
                    class: 'secondary'
                }, {
                    name: 'Create New',
                    class: 'secondary'
                }, {
                    name: 'Continue with Draft',
                    class: 'primary'
                }]
            },
        });

        dialogOptionRef.onClose.subscribe((result: string) => {
            if (result != 'Cancel') {
                if (result === 'Continue with Draft') {
                    this.draftRestore();
                }

                if (callback) {
                    callback.call(this);
                }
            }
        });
    }

    public draftRestore() {
        if (this.draftDocument) {
            if (this.needPreset && this.rowDocument) {
                this.preset(MergeUtils.deepMerge(this.draftDocument.data, this.presetDocument))
            } else {
                this.preset(this.draftDocument.data);
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
}