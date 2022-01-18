import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog allowing you to select a file and load schemes.
 */
@Component({
    selector: 'version-schema-dialog',
    templateUrl: './version-schema-dialog.component.html',
    styleUrls: ['./version-schema-dialog.component.css']
})
export class VersionSchemaDialog {
    version!: any;

    constructor(
        public dialogRef: MatDialogRef<VersionSchemaDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    }

    ngOnInit() {

    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        this.dialogRef.close(this.version);
    }
}