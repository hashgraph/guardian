import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for preview schema.
 */
@Component({
    selector: 'app-schema-view-dialog',
    templateUrl: './schema-view-dialog.component.html',
    styleUrls: ['./schema-view-dialog.component.css']
})
export class SchemaViewDialog {
    loading = true;
    schemes!: any[];

    constructor(
        public dialogRef: MatDialogRef<SchemaViewDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    ngOnInit() {
        this.schemes = this.data.schemes || [];
        this.loading = false;
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    onImport() {
        this.dialogRef.close(true);
    }

    onNewVersionClick(messageId: string) {
        this.dialogRef.close({
            messageId
        });
    }
}