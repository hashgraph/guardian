import {
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DocumentGenerator, IUser, Schema } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Component for display block of 'requestVcDocumentBlockAddon' types.
 */
@Component({
    selector: 'request-document-block-addon',
    templateUrl: './request-document-block-addon.component.html',
    styleUrls: ['./request-document-block-addon.component.scss'],
})
export class RequestDocumentBlockAddonComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;
    @Input('dryRun') dryRun!: any;
    @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<any>;

    public isExist = false;
    public disabled = false;
    public loading: boolean = true;
    public socket: any;
    public dialogLoading: boolean = false;
    public dataForm: UntypedFormGroup;
    public schema: any;
    public buttonName: any;
    public uiClass: any;
    public dialogTitle: any;
    public dialogRef: any;
    public ref: any;
    public title: any;
    public presetDocument: any;
    public rowDocument: any;
    public needPreset: any;
    public presetFields: any;
    public presetReadonlyFields: any;
    public user!: IUser;
    public restoreData: any;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private profile: ProfileService,
        private policyHelper: PolicyHelper,
        private fb: UntypedFormBuilder,
        private dialog: MatDialog,
        private dialogService: DialogService,
        private router: Router,
        private changeDetectorRef: ChangeDetectorRef
    ) {
        this.dataForm = fb.group({});
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        this.profile.getProfile().subscribe((user: IUser) => {
            this.user = user;
            this.loadData();
        });
        (window as any).__requestLast = this;
        (window as any).__request = (window as any).__request || {};
        (window as any).__request[this.id] = this;
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    getJson(data: any, presetFields: any[]) {
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

    setData(data: any) {
        if (data) {
            const row = data.data;
            const schema = data.schema;
            const active = data.active;
            this.ref = row;
            this.schema = new Schema(schema);
            this.buttonName = data.buttonName;
            this.uiClass = data.uiClass;
            this.dialogTitle = data.dialogTitle;
            this.disabled = active === false;
            this.isExist = true;
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

    onSubmit() {
        if (this.disabled) {
            return;
        }
        if (this.loading) {
            return;
        }
        if (this.dataForm.valid) {
            const data = this.dataForm.getRawValue();
            this.prepareDataFrom(data);
            this.dialogRef.close();
            this.dialogRef = null;
            this.loading = true;
            this.policyEngineService
                .setBlockData(this.id, this.policyId, {
                    document: data,
                    ref: this.ref?.id,
                })
                .subscribe(
                    // tslint:disable-next-line:no-empty
                    () => {},
                    (e) => {
                        this.loading = false;
                    }
                );
        }
    }

    prepareDataFrom(data: any) {
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

    preset(document: any) {
        this.presetDocument = document;
        this.changeDetectorRef.detectChanges();
    }

    onCancel(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
            this.dialogRef = null;
        }
    }

    onDialog() {
        this.dataForm.reset();
        if (this.needPreset && this.rowDocument) {
            this.preset(this.rowDocument);
        } else {
            this.presetDocument = null;
        }

        if (window.innerWidth <= 810) {
            this.dialogRef = this.dialog.open(this.dialogTemplate, {
                width: `100vw`,
                maxWidth: '100vw',
                position: {
                    bottom: '0',
                },
                panelClass: 'g-dialog',
                hasBackdrop: true, // Shadows beyond the dialog
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: this,
            });
        } else {
            this.dialogRef = this.dialog.open(this.dialogTemplate, {
                width: '850px',
                disableClose: true,
                data: this,
            });
        }
    }

    onDryRun() {
        const presetDocument = DocumentGenerator.generateDocument(this.schema);
        this.preset(presetDocument);
    }

    handleCancelBtnEvent(value: boolean, data: any) {
        data.onCancel();
    }

    handleSubmitBtnEvent(value: boolean, data: any) {
        if (data.dataForm.valid || !this.loading) {
            data.onSubmit();
        }
    }

    onCancelPage(value: boolean) {
        this.router.navigate(['/policy-viewer']);
    }
}
