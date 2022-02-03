import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
/**
 * Export schema dialog.
 */
@Component({
    selector: 'export-schema-dialog',
    templateUrl: './export-schema-dialog.component.html',
    styleUrls: ['./export-schema-dialog.component.css']
})
export class ExportSchemaDialog {

    schemas!: any

    constructor(
        public dialogRef: MatDialogRef<ExportSchemaDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schemas = data.schemas
    }

    ngOnInit() {
    }

    getSchemaTitle(schema: any) {
        return `${schema.uuid} (${schema.name})`;
    }
}
