import { Component, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { SchemaConfigurationComponent } from '../../schema-configuration/schema-configuration.component';
import { Schema } from 'interfaces';

/**
 * Dialog for creating and editing schemes.
 */
@Component({
    selector: 'schema-dialog',
    templateUrl: './schema-dialog.component.html',
    styleUrls: ['./schema-dialog.component.css']
})
export class SchemaDialog {
    @ViewChild('document') schemaControl!: SchemaConfigurationComponent;

    schemes: Schema[];
    scheme: Schema;
    started: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<SchemaDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.schemes = data.schemes || [];
        this.scheme = data.scheme || null;
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.started = true;
        });
    }

    getDocument(schema: Schema | null) {
        this.dialogRef.close(schema);
    }

    onClose() {
        this.dialogRef.close(null);
    }

    onCreate() {
        const schema = this.schemaControl?.getSchema();
        this.dialogRef.close(schema);
    }
}