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
    topicId: any;
    policies: any[];

    constructor(
        public dialogRef: MatDialogRef<SchemaViewDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.schemes = this.data.schemes || [];
        this.topicId = this.data.topicId || null;
        this.policies = this.data.policies || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    onImport() {
        this.dialogRef.close({ topicId: this.topicId });
    }

    onNewVersionClick(messageId: string) {
        this.dialogRef.close({ messageId });
    }
}