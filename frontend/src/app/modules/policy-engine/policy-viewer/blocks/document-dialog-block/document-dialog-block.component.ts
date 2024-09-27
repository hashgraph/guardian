import { Component, OnInit, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'document-dialog-block',
    templateUrl: './document-dialog-block.component.html',
    styleUrls: ['./document-dialog-block.component.scss']
})
export class DocumentDialogBlock implements OnInit {
    title: string = "";
    json: string = "";

    constructor(
        public dialogRef: MatDialogRef<DocumentDialogBlock>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    ngOnInit() {
        const {
            document,
            title,
            dialogType,
            dialogClass,
        } = this.data;

        this.title = title;
        this.json = JSON.stringify((document), null, 4);
    }

    onClick(): void {
        this.dialogRef.close(null);
    }
}