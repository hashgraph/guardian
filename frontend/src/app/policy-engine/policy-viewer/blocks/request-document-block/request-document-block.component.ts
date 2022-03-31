import { ChangeDetectorRef, Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { IUser } from 'interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { ProfileService } from 'src/app/services/profile.service';

/**
 * Component for display block of 'requestVcDocument' types.
 */
@Component({
    selector: 'request-document-block',
    templateUrl: './request-document-block.component.html',
    styleUrls: ['./request-document-block.component.css']
})
export class RequestDocumentBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;
    @ViewChild("dialogTemplate") dialogTemplate!: TemplateRef<any>;

    isExist = false;
    disabled = false;
    loading: boolean = true;
    socket: any;

    dataForm: FormGroup;
    schema: any;
    hideFields: any;
    type!: string;
    content: any;
    dialogContent: any;
    dialogClass: any;
    dialogRef: any;
    ref: any;
    title: any;
    description: any;
    presetDocument: any;
    rowDocument: any;
    needPreset: any;
    presetFields: any;
    buttonClass: any;
    user!: IUser;

    constructor(
        private policyEngineService: PolicyEngineService,
        private profile: ProfileService,
        private policyHelper: PolicyHelper,
        private fb: FormBuilder,
        private dialog: MatDialog,
        private changeDetectorRef: ChangeDetectorRef
    ) {
        this.dataForm = fb.group({});
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.policyEngineService.subscribe(this.onUpdate.bind(this));
        }
        this.profile.getProfile()
            .subscribe((user: IUser) => {
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

    onUpdate(id: string): void {
        if (this.id == id) {
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
            this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    getId(data: any) {
        try {
            if (data) {
                if (Array.isArray(data.document.credentialSubject)) {
                    return data.document.credentialSubject[0].id;
                } else {
                    return data.document.credentialSubject.id;
                }
            }
        } catch (error) {
            return null;
        }
        return null;
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
            const uiMetaData = data.uiMetaData;
            const row = data.data;
            const schema = data.schema;
            const active = data.active;
            this.ref = this.getId(row);
            this.type = uiMetaData.type;
            this.schema = schema;
            this.hideFields = {};
            if (uiMetaData.privateFields) {
                for (let index = 0; index < uiMetaData.privateFields.length; index++) {
                    const field = uiMetaData.privateFields[index];
                    this.hideFields[field] = true;
                }
            }
            if (this.type == 'dialog') {
                this.content = uiMetaData.content;
                this.buttonClass = uiMetaData.buttonClass;
                this.dialogContent = uiMetaData.dialogContent;
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

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.prepareDataFrom(data);
            this.policyEngineService.setBlockData(this.id, this.policyId, {
                document: data,
                ref: this.ref
            }).subscribe(() => {
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
            if (this.dialogRef) {
                this.dialogRef.close();
                this.dialogRef = null;
            }
        }
    }

    prepareDataFrom(data: any) {
        if (Array.isArray(data)) {
            for (let j = 0; j < data.length; j++) {
                let dataArrayElem = data[j];
                if (dataArrayElem === "" || dataArrayElem === null) {
                    data.splice(j, 1);
                    j--;
                }
                if (Object.getPrototypeOf(dataArrayElem) === Object.prototype
                    || Array.isArray(dataArrayElem)) {
                    this.prepareDataFrom(dataArrayElem);
                }
            }
        }

        if (Object.getPrototypeOf(data) === Object.prototype) {
            let dataKeys = Object.keys(data);
            for (let i = 0; i < dataKeys.length; i++) {
                const dataElem = data[dataKeys[i]];
                if (dataElem === "" || dataElem === null) {
                    delete data[dataKeys[i]];
                }
                if (Object.getPrototypeOf(dataElem) === Object.prototype
                    || Array.isArray(dataElem)) {
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
        this.dialogRef = this.dialog.open(this.dialogTemplate, {
            width: '850px',
            data: this
        });
    }
}
