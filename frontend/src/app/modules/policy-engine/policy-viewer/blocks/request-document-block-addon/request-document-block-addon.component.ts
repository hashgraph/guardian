import {
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
    ComponentRef,
    inject,
} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { DocumentGenerator, ISchema, IUser, Schema, PolicyStatus } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { DialogService } from 'primeng/dynamicdialog';
import { AbstractUIBlockComponent } from '../models/abstract-ui-block.component';
import { RequestDocumentFormComponent } from '../request-document-block/form/request-document-form.component';
import { FormTakeoverService } from '../../form-takeover/form-takeover.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaService } from 'src/app/services/schema.service';

interface IRequestDocumentAddonData {
    readonly: boolean;
    schema: ISchema;
    active: boolean;
    relayerAccount: boolean;
    enableAdditionalData: boolean;
    data: any;
    buttonName: string;
    hideWhenDiscontinued?: boolean;
    uiClass: string;
    dialogTitle: string;
    preset: boolean;
    presetFields: any[];
    restoreData: any;
}

/**
 * Component for display block of 'requestVcDocumentBlockAddon' types.
 */
@Component({
    selector: 'request-document-block-addon',
    templateUrl: './request-document-block-addon.component.html',
    styleUrls: ['./request-document-block-addon.component.scss'],
    standalone: false
})
export class RequestDocumentBlockAddonComponent
    extends AbstractUIBlockComponent<IRequestDocumentAddonData>
    implements OnInit {

    @Input('id') override id!: string;
    @Input('policyId') override policyId!: string;
    @Input('static') override static!: any;
    @Input('dryRun') dryRun!: any;
    @Input('savepointIds') override savepointIds?: string[] | null = null;
    @Input('policyStatus') policyStatus!: string;

    public isExist = false;
    public disabled = false;
    public schema: Schema | null;
    public dataForm: UntypedFormGroup;
    public ref: any;
    public title: any;
    public rowDocument: any;
    public needPreset: any;
    public presetDocument: any;
    public presetFields: any;
    public presetReadonlyFields: any;
    public dialogLoading: boolean = false;
    public dialogTitle: any;
    public uiClass: any;
    public buttonName: any;
    public hideWhenDiscontinued?: boolean = false;
    public restoreData: any;
    public rules: any;
    public hideFields: any;
    public readonly: boolean = false;
    public form: RequestDocumentFormComponent | null = null;
    // Drafts are always allowed here: `edit` and `draft` are never set for the addon
    public readonly allowDraft: boolean = true;
    private formTakeover = inject(FormTakeoverService, { optional: true });
    private takeoverRef: ComponentRef<RequestDocumentFormComponent> | null = null;
    public edit: boolean;
    public draft: boolean;
    public relayerAccount: boolean;
    public enableAdditionalData: boolean = false;
    public isLocalUser: boolean = true;

    constructor(
        policyEngineService: PolicyEngineService,
        wsService: WebSocketService,
        profile: ProfileService,
        policyHelper: PolicyHelper,
        private schemaRulesService: SchemaRulesService,
        private fb: UntypedFormBuilder,
        private dialogService: DialogService,
        private changeDetectorRef: ChangeDetectorRef,
        private schemaService: SchemaService,
    ) {
        super(policyEngineService, profile, wsService);
        this.dataForm = this.fb.group({});
    }

    protected override _onSuccess(data: any) {
        // Resolve a schema reference (id, no document) to the full schema before setData.
        const schemaRef = data?.schema;
        if (schemaRef && !schemaRef.document && schemaRef.id) {
            this.loading = true;
            this.schemaService.evictSchemaById(schemaRef.id);
            this.schemaService.resolveSchemaById(schemaRef.id).subscribe({
                next: (full) => {
                    data.schema = full;
                    super._onSuccess(data);
                },
                error: (e) => this._onError(e)
            });
            return;
        }
        super._onSuccess(data);
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
        Object.keys(this.dataForm.controls).forEach(key => {
            if (!this.dataForm.get(key)?.valid) {
                errors.push(key);
            }
        });
        console.log(errors);
    }

    override setData(data: IRequestDocumentAddonData) {
        if (data) {
            this.readonly = !!data.readonly;
            const row = data.data;
            const schema = data.schema;
            const active = data.active;
            this.ref = row;
            this.schema = new Schema(schema);
            this.buttonName = data.buttonName;
            this.hideWhenDiscontinued = !!data.hideWhenDiscontinued;
            this.uiClass = data.uiClass;
            this.dialogTitle = data.dialogTitle;
            this.disabled = active === false;
            this.isExist = true;
            this.relayerAccount = !!data.relayerAccount && !this.dryRun;
            this.enableAdditionalData = !!data.enableAdditionalData && !this.dryRun;
            this.needPreset = data.preset;
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
                // tslint:disable-next-line:prefer-for-of
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

    public preset(document: any) {
        this.presetDocument = document;
        this.changeDetectorRef.detectChanges();
        this.form?.detectChanges();
    }

    public getRef() {
        return this.ref.id;
    }

    public getAutosaveId() {
        return this.ref?.id ?? `${this.policyId}_${this.id}_${this?.user?.id}`;
    }

    public onDialog() {
        this.dataForm.reset();
        if (this.needPreset && this.rowDocument) {
            this.preset(this.rowDocument);
        } else {
            this.presetDocument = null;
        }

        if (this.formTakeover) {
            const ref = this.formTakeover.open(RequestDocumentFormComponent, {
                parent: this,
                allowDraft: this.allowDraft
            });
            this.takeoverRef = ref;
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
            styleClass: 'guardian-dialog pv-scope',
            data: this
        });
    }

    public onDryRun() {
        if (this.schema) {
            const presetDocument = DocumentGenerator.generateDocument(this.schema, undefined, this.rowDocument);
            this.preset(presetDocument);
        }
    }

    public onRestoreClick() {
        return;
    }
}
