import { Component, Inject, Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Schema } from '@guardian/interfaces';

/**
 * Dialog for display json
 */
@Component({
    selector: 'vc-dialog',
    templateUrl: './vc-dialog.component.html',
    styleUrls: ['./vc-dialog.component.css']
})
export class VCViewerDialog {
    title: string = "";
    json: string = "";
    text: string = "";
    viewDocument!: boolean;
    isVcDocument!: boolean;
    document: any;
    type: any;
    isVpDocument!: boolean;
    isJsonDocument!: boolean;
    toggle: boolean = true;
    schema: any;

    constructor(
        public dialogRef: MatDialogRef<VCViewerDialog>,
        @Inject(MAT_DIALOG_DATA) public data: {
            document: any,
            title: string,
            viewDocument?: boolean,
            type?: 'VC' | 'VP' | 'JSON' | 'TEXT',
            toggle?: boolean,
            schema?: any
        }) {
    }

    ngOnInit() {
        const {
            document,
            title,
            viewDocument,
            type,
            toggle,
            schema
        } = this.data;
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
        if (this.type == 'VC') {
            this.isVcDocument = true;
        } else if (this.type == 'VP') {
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
