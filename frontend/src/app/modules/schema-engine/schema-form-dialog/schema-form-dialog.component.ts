import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DocumentGenerator, Schema } from '@guardian/interfaces';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SchemaService } from '../../../services/schema.service';

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

    public category: string;

    constructor(
        public dialogRef: MatDialogRef<SchemaFormDialog>,
        private fb: FormBuilder,
        private schemaService: SchemaService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schema = data.schema || null;
        this.example = data.example || false;
        this.dataForm = fb.group({});
        this.hideFields = {};
        this.category = data.category
    }

    ngOnInit(): void {
        this.getSubSchemes()
    }

    onClose() {
        this.dialogRef.close(null);
    }

    onSave() {
        this.dialogRef.close(this.dataForm?.value);
    }

    getSubSchemes() {
        const { topicId, id} = this.schema ?? {};

        this.schemaService.getSchemaWithSubSchemas(this.category, id, topicId).subscribe((data) => {
            if(this.schema && data.schema) {
                this.schema = new Schema(data.schema)
            }

            if (this.example) {
                this.presetDocument = DocumentGenerator.generateDocument(this.schema);
            } else {
                this.presetDocument = null
            }

            this.started = true
        });
    }
}
