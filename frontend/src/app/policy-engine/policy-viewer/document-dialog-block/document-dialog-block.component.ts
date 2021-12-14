import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'document-dialog-block',
    templateUrl: './document-dialog-block.component.html',
    styleUrls: ['./document-dialog-block.component.css']
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