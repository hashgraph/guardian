import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DocumentGenerator, Schema } from '@guardian/interfaces';
import { FormBuilder, FormGroup } from '@angular/forms';

/**
 * Dialog for creating and editing schemas.
 */
@Component({
    selector: 'schema-form-dialog',
    templateUrl: './schema-form-dialog.component.html',
    styleUrls: ['./schema-form-dialog.component.scss']
})
export class SchemaFormDialog {
    public schema: Schema;
    public started: boolean = false;
    public dataForm: FormGroup;
    public presetDocument: any;
    public hideFields: any;
    public example: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<SchemaFormDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schema = data.schema || null;
        this.example = data.example || false;
        this.dataForm = fb.group({});
        this.hideFields = {};
        if (this.example) {
            const presetDocument = DocumentGenerator.generateDocument(this.schema);
            this.presetDocument = presetDocument;
        } else {
            this.presetDocument = null;
        }
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.started = true;
        });
    }

    onClose() {
        this.dialogRef.close(null);
    }

    onSave() {
        this.dialogRef.close(this.dataForm?.value);
    }
}
