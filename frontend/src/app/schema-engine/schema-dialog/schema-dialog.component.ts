import { Component, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { Schema } from '@guardian/interfaces';

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

    scheme: Schema;
    schemesMap: any;
    started: boolean = false;
    type: 'new' | 'edit' | 'version' = 'new';
    topicId: any;
    policies: any[];

    constructor(
        public dialogRef: MatDialogRef<SchemaDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.schemesMap = data.schemesMap || {};
        this.scheme = data.scheme || null;
        this.type = data.type || null;
        this.topicId = data.topicId || null;
        this.policies = data.policies || [];
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
