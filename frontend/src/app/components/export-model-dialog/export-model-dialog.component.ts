import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
/**
 * Export schema dialog.
 */
@Component({
    selector: 'export-model-dialog',
    templateUrl: './export-model-dialog.component.html',
    styleUrls: ['./export-model-dialog.component.css']
})
export class ExportModelDialog {

    models!: any

    constructor(
        public dialogRef: MatDialogRef<ExportModelDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.models = data.models;
    }

    ngOnInit() {
    }

    getSchemaTitle(model: any) {
        return `${model.name} (${model.version}): ${model.messageId}`;
    }
}
