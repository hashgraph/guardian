import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'vc-dialog',
    templateUrl: './vc-dialog.component.html',
    styleUrls: ['./vc-dialog.component.scss']
})
export class VCViewerDialog {
    public id: string = '';
    public title: string = '';
    public json: string = '';
    public text: string = '';
    public viewDocument!: boolean;
    public isVcDocument!: boolean;
    public document: any;
    public type: any;
    public isVpDocument!: boolean;
    public isJsonDocument!: boolean;
    public toggle: boolean = true;
    public schema: any;
    public dryRun: boolean = false;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig) {
    }

    ngOnInit() {
        const {
            id,
            dryRun,
            document,
            title,
            viewDocument,
            type,
            toggle,
            schema
        } = this.dialogConfig.data;
        this.id = id;
        this.dryRun = !!dryRun;
        this.title = title;
        this.json = document ? JSON.stringify((document), null, 4) : '';
        this.text = document || '';
        this.document = document;
        this.type = type || 'JSON';
        this.toggle = toggle !== false;
        if (!this.document) {
            this.type = 'JSON';
            this.toggle = false;
        }

        this.isVcDocument = false;
        this.isVpDocument = false;
        this.isJsonDocument = false;
        if (this.type === 'VC') {
            this.isVcDocument = true;
        } else if (this.type === 'VP') {
            this.isVpDocument = true;
        } else {
            this.isJsonDocument = true;
        }
        this.viewDocument = (viewDocument || false) && (this.isVcDocument || this.isVpDocument);
        this.schema = schema;
    }

    onClick(): void {
        this.dialogRef.close(null);
    }
}
