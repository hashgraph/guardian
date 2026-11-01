import { ChangeDetectorRef, Component, ComponentRef, Input, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { DocumentGenerator, ISchema, LocationType, Schema } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { DialogService } from 'primeng/dynamicdialog';
import { AbstractUIBlockComponent } from '../models/abstract-ui-block.component';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { RequestDocumentFormComponent } from './form/request-document-form.component';
import { FormTakeoverService } from '../../form-takeover/form-takeover.service';
import { SchemaService } from 'src/app/services/schema.service';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { SavepointFlowService } from 'src/app/services/savepoint-flow.service';
import { DocumentAutosaveStorage } from '../../../structures';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { PolicyStatus } from '@guardian/interfaces';

interface IRequestDocumentData {
    readonly: boolean;
    schema: ISchema;
    active: boolean;
    presetSchema: any;
    presetFields: any[];
    restoreData: any;
    data: any;
    relayerAccount: boolean;
    enableAdditionalData: boolean;
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
    styleUrls: ['./request-document-block.component.scss'],
    standalone: false
})
export class RequestDocumentBlockComponent
    extends AbstractUIBlockComponent<IRequestDocumentData>
    implements OnInit {

    @Input('id') override id!: string;
    @Input('policyId') override policyId!: string;
    @Input('static') override static!: any;
    @Input('dryRun') dryRun!: any;
    @Input('savepointIds') override savepointIds?: string[] | null = null;
    @Input('policyStatus') policyStatus!: string;

    @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<any>;

    public isExist = false;
    public disabled = false;
    public schema: Schema | null;
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
    public buttonClass: any;
    public restoreData: any;
    public readonly: boolean = false;
    public draft: boolean;
    public relayerAccount: boolean;
    public draftId?: string;
    public form: RequestDocumentFormComponent | null = null;
    public edit: boolean;
    private storage: DocumentAutosaveStorage;
    public isLocalUser: boolean = true;
    public enableAdditionalData: boolean = false;

    // Only inside the policy viewer; the block is also rendered in modals outside of it
    private formTakeover = inject(FormTakeoverService, { optional: true });
    private pageFormOpened = false;
    private takeoverRef: ComponentRef<RequestDocumentFormComponent> | null = null;

    constructor(
        policyEngineService: PolicyEngineService,
        wsService: WebSocketService,
        profile: ProfileService,
        policyHelper: PolicyHelper,
        private dialogService: DialogService,
        private changeDetectorRef: ChangeDetectorRef,
        private savepointFlow: SavepointFlowService,
        private indexedDb: IndexedDbRegistryService,
        private tablePersist: TablePersistenceService,
        private geoFilePersist: GeoFilePersistenceService,
        private schemaService: SchemaService,
    ) {
        super(policyEngineService, profile, wsService);
        this.storage = new DocumentAutosaveStorage(indexedDb);
    }

    ngOnInit(): void {
        this.init();
        (window as any).__requestLast = this;
        (window as any).__request = (window as any).__request || {};
        (window as any).__request[this.id] = this;
    }

    ngOnDestroy(): void {
        if (this.takeoverRef) {
            this.formTakeover?.close(this.takeoverRef);
        }
        this.destroy();
    }

    public __validate() {
        const errors: string[] = [];
        if (this.form?.dataForm) {
            this.__findError(this.form.dataForm, errors, '');
        }
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

    protected override _onSuccess(data: any) {
        // A schema reference (id, no document) is resolved to the full schema once
        // before the render flow; a full schema is used as-is.
        const schemaRef = data?.schema;
        if (schemaRef && !schemaRef.document && schemaRef.id) {
            this.loading = true;
            this.schemaService.evictSchemaById(schemaRef.id);
            this.schemaService.resolveSchemaById(schemaRef.id).subscribe({
                next: (full) => {
                    data.schema = full;
                    this._applyBlockData(data);
                },
                error: (e) => this._onError(e)
            });
            return;
        }
        this._applyBlockData(data);
    }

    private _applyBlockData(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
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
            this.enableAdditionalData = !!data.enableAdditionalData && !this.dryRun;
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
            this.openPageFormOnce();
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

    // A page-type block is the form itself, so it opens on first render. After the user
    // closes the form, the "Start" card lets them reopen it.
    private openPageFormOnce() {
        if (this.type !== 'page' || this.pageFormOpened || !this.formTakeover || this.disabled || this.readonly) {
            return;
        }
        this.pageFormOpened = true;
        setTimeout(() => this.onDialogOpen());
    }

    isBtnVisible() {
        if (this.policyStatus === PolicyStatus.DISCONTINUED && this.hideWhenDiscontinued) {
            return false;
        }

        return true;
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

    public onDraftImported(doc: any): void {
        this.preset(doc);
    }

    public preset(document: any) {
        this.presetDocument = document;
        this.changeDetectorRef.detectChanges();
        this.form?.detectChanges();
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

    public get allowDraft(): boolean {
        return this.type === 'page' ? false : (!this.edit || this.draft);
    }

    private showDocumentDialog() {
        if (this.formTakeover) {
            this.takeoverRef = this.formTakeover.open(RequestDocumentFormComponent, {
                parent: this,
                allowDraft: this.allowDraft
            });
            const ref = this.takeoverRef;
            ref.instance.closed.subscribe(() => {
                if (this.takeoverRef === ref) {
                    this.takeoverRef = null;
                }
            });
            return;
        }
        this.dialogService.open(RequestDocumentFormComponent, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog without-padding pv-scope',
            data: this
        });
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
        })!;

        dialogOptionRef.onClose.subscribe(async (result: string) => {
            if (result != 'Cancel') {

                if (result === 'Restore') {
                    this.preset(autosaveDocument);

                    await this.tablePersist.restoreTablesFromDraft(autosaveDocument);
                    await this.geoFilePersist.restoreGeoFilesFromDraft(autosaveDocument);

                    this.savepointFlow.setSkipOnce();
                    this.showDocumentDialog();
                }
                else if (result === 'No') {
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

}
