import { Component, Inject, Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Schema } from 'interfaces';

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
    viewDocument!: boolean;
    isVcDocument!: boolean;
    schemas: any;
    document: any;
    type: any;
    isVpDocument!: boolean;
    isJsonDocument!: boolean;

    constructor(
        public dialogRef: MatDialogRef<VCViewerDialog>,
        @Inject(MAT_DIALOG_DATA) public data: {
            document: any,
            title: string,
            viewDocument?: boolean,
            type?: 'VC' | 'VP' | 'JSON',
            schemas?: Schema[],
        }) {
    }

    ngOnInit() {
        const {
            document,
            title,
            viewDocument,
            type,
            schemas
        } = this.data;
        this.title = title;
        this.json = JSON.stringify((document), null, 4);
        this.document = document;
        this.type = type || 'JSON';

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
        this.schemas = schemas;
    }

    onClick(): void {
        this.dialogRef.close(null);
    }
}
