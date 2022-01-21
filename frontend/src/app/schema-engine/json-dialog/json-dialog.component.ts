import { Component, Inject, Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'json-dialog',
    templateUrl: './json-dialog.component.html',
    styleUrls: ['./json-dialog.component.css']
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
