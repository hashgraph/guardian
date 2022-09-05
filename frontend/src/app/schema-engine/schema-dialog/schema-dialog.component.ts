import { ChangeDetectorRef, Component, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { Schema } from '@guardian/interfaces';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

/**
 * Dialog for creating and editing schemas.
 */
@Component({
    selector: 'schema-dialog',
    templateUrl: './schema-dialog.component.html',
    styleUrls: ['./schema-dialog.component.css']
})
export class SchemaDialog {
    @ViewChild('document') schemaControl!: SchemaConfigurationComponent;

    scheme: Schema;
    schemasMap: any;
    started: boolean = false;
    type: 'new' | 'edit' | 'version' = 'new';
    topicId: any;
    policies: any[];
    system: boolean = false;
    valid: boolean = true;
    extended: boolean = false;
    fields: any[] = [];

    constructor(
        public dialogRef: MatDialogRef<SchemaDialog>,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.schemasMap = data.schemasMap || {};
        this.scheme = data.scheme || null;
        this.type = data.type || null;
        this.topicId = data.topicId || null;
        this.policies = data.policies || [];
        this.system = data.system || false;
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

    onChangeForm(schemaControl: SchemaConfigurationComponent) {
        this.valid = schemaControl.isValid();
    }
    
    onChangeFields(fields: any[]) {
        this.fields = fields;
        this.cdr.detectChanges();
    }

    drop(event: CdkDragDrop<any[]>) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
}
