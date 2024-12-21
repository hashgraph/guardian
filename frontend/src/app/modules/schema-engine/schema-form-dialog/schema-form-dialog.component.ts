import { Component, Inject } from '@angular/core';
import { DocumentGenerator, Schema } from '@guardian/interfaces';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { SchemaService } from '../../../services/schema.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';


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
    public dataForm: UntypedFormGroup;
    public presetDocument: any;
    public hideFields: any;
    public example: boolean = false;

    public category: string;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
        private schemaService: SchemaService,
    ) {
        const data = this.config.data

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
        this.dialogRef.close({exampleDate: this.dataForm?.value, currentSchema: this.schema});
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
