import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

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

    isActive = false;
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

    title: any;
    description: any;

    constructor(
        private policyEngineService: PolicyEngineService,
        private fb: FormBuilder,
        private dialog: MatDialog
    ) {
        this.dataForm = fb.group({});
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.policyEngineService.subscribe(this.onUpdate.bind(this));
        }
        this.loadData();
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
            this.policyEngineService.getData(this.id, this.policyId).subscribe((data: any) => {
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

    setData(data: any) {
        if (data) {
            const uiMetaData = data.uiMetaData;
            const schema = data.data;
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
                this.dialogContent = uiMetaData.dialogContent;
                this.dialogClass = uiMetaData.dialogClass;
                this.description = uiMetaData.description;
            }
            if(this.type == 'page') {
                this.title = uiMetaData.title;
                this.description = uiMetaData.description;
            }
            this.isActive = data.isActive;
        } else {
            this.schema = null;
            this.hideFields = null;
            this.isActive = false;
        }
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.policyEngineService.setData(this.id, this.policyId, data).subscribe(() => {
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

    onCancel(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
            this.dialogRef = null;
        }
    }


    onDialog() {
        this.dialogRef = this.dialog.open(this.dialogTemplate, {
            width: '850px',
            data: this
        });
    }
}
