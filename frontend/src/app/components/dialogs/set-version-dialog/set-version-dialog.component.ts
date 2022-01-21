import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog allowing you to select a file and load schemes.
 */
@Component({
    selector: 'set-version-dialog',
    templateUrl: './set-version-dialog.component.html',
    styleUrls: ['./set-version-dialog.component.css']
})
export class SetVersionDialog {
    version!: any;

    constructor(
        public dialogRef: MatDialogRef<SetVersionDialog>,
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
