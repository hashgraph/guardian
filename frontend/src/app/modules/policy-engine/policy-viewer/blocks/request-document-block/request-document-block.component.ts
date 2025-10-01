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
import { interval, Subject, Subscription, firstValueFrom } from 'rxjs';
import { prepareVcData } from 'src/app/modules/common/models/prepare-vc-data';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { MergeUtils } from 'src/app/utils';
import { ToastrService } from 'ngx-toastr';
import { SavepointFlowService } from 'src/app/services/savepoint-flow.service';
import { DocumentAutosaveStorage } from '../../../structures';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { getMinutesAgoStream } from 'src/app/utils/autosave-utils';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { PolicyStatus } from '@guardian/interfaces';

interface IRequestDocumentData {
    readonly: boolean;
    schema: ISchema;
    active: boolean;
    presetSchema: any;
    presetFields: any[];
    restoreData: any;
    data: any;
    draft: boolean;
    uiMetaData: {
        type: string;
        title: string;
        description: string;
        content: string;
        privateFields: string[];
        buttonClass: string;
        dialogContent: string;
        dialogClass: string;
        editType: 'new' | 'edit';
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
    public hideWhenDiscontinued: any;
    public dialogRef: any;
    public buttonClass: any;
    public restoreData: any;
    public rules: DocumentValidators;
    public rulesResults: any;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    public readonly: boolean = false;
    public draft: boolean;
    public draftId?: string;
    public dialog: RequestDocumentBlockDialog;
    public edit: boolean;
    private storage: DocumentAutosaveStorage;

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

        if(autosaveDocument) {
            this.showAutosaveDialog(autosaveDocument);
        }
    }

    override setData(data: IRequestDocumentData) {
        if (data) {
            const isDraft = data.data?.draft ?? false;

            this.readonly = !!data.readonly;
            const uiMetaData = data.uiMetaData;
            const row = data.data;
            const schema = data.schema;
            const active = data.active;
            this.ref = row;
            this.type = uiMetaData.type;
            this.edit = uiMetaData.editType === 'edit';
            this.schema = new Schema(schema);
            this.hideFields = {};
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

    public async onSubmit(draft?: boolean) {
        if (this.disabled || this.loading) {
            return;
        }

        if (this.dataForm.valid || draft) {
            const data = this.dataForm.getRawValue();
            this.loading = true;
            this.storage.delete(this.getAutosaveId());

            await this.tablePersist.persistTablesInDocument(data, !!this.dryRun);

            prepareVcData(data);
            this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                    document: data,
                    ref: this.ref,
                    draft,
                    draftId: this.draftId
                });
        }
    }

    public handleSaveBtnEvent($event: any) {
        if (!this.loading) {
            this.onSubmit(true);
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
        if(!this.ref) {
            return null;
        }

        if(this.ref.draft) {
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

        if(autosaveDocument) {
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

        if(this.edit && this.draft) {
            this.draftRestore();
        }

        this.showDocumentDialog();
    }

    private showDocumentDialog() {
        const dialogRef = this.dialogService.open(RequestDocumentBlockDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: this
        });

        dialogRef && dialogRef.onClose.subscribe(async (result) => {});
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

        dialogOptionRef.onClose.subscribe((result: string) => {
            if (result != 'Cancel') {
                if (result === 'Restore') {
                    this.preset(autosaveDocument);
                    this.savepointFlow.setSkipOnce();
                    if (this.type == 'dialog') {
                        this.showDocumentDialog();
                    }
                }
                else if(result === 'No' && this.type === 'dialog') {
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
