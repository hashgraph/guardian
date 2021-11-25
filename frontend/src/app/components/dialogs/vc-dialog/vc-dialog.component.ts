import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'vc-dialog',
    templateUrl: './vc-dialog.component.html',
    styleUrls: ['./vc-dialog.component.css']
})
export class JsonDialog {
    title: string = "";
    json: string = "";

    constructor(
        public dialogRef: MatDialogRef<JsonDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    ngOnInit() {
        const { document, title } = this.data;
        this.title = title;
        this.json = JSON.stringify((document), null, 4);
    }

    onClick(): void {
        this.dialogRef.close(null);
    }
}