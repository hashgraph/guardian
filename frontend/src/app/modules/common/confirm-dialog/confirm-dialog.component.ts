import {Component, Inject} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

/**
 * Dialog allowing you to select a file and load schemes.
 */
@Component({
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialog {
    public title: string = '';
    public description?: string;
    public descriptions?: string[];
    public submitButton: string = 'Ok';
    public cancelButton: string = 'Cancel';

    constructor(
        // public dialogRef: MatDialogRef<ConfirmDialog>,
        // @Inject(MAT_DIALOG_DATA) public data: any
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        const data = this.config.data

        this.title = data.title;
        this.submitButton = data.submitButton || 'Ok';
        this.cancelButton = data.cancelButton || 'Cancel';
        if (Array.isArray(data.description)) {
            this.descriptions = data.description;
        } else {
            this.description = data.description;
        }
    }

    ngOnInit() {
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        this.dialogRef.close(true);
    }
}
