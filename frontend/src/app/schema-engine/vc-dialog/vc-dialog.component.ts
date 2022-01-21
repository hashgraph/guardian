import { Component, Inject, Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

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
    schemas: any;
    vc: any;
    viewVcDocument!: boolean;
    isVcDocument!: boolean;

    constructor(
        public dialogRef: MatDialogRef<VCViewerDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    ngOnInit() {
        const { 
            document,
            schemas, 
            title, 
            viewVcDocument, 
            isVcDocument
        } = this.data;
        this.title = title;
        this.schemas = schemas;
        this.vc = document.document;
        this.json = JSON.stringify((document), null, 4);
        this.viewVcDocument = viewVcDocument && isVcDocument;
        this.isVcDocument = isVcDocument;
    }

    onClick(): void {
        this.dialogRef.close(null);
    }
}
