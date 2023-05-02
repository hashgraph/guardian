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
    schemaType: string = 'policy';
    valid: boolean = true;
    extended: boolean = false;
    fields: any[] = [];
    restoreData: any = null;
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
        this.schemaType = data.schemaType || 'policy';
    }

    ngOnInit(): void {
        const restoreData = localStorage.getItem('restoreSchemaData');
        if (restoreData) {
            try {
                this.restoreData = JSON.parse(restoreData);
            } catch {
                this.restoreData = null;
            }
        }
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
        localStorage.setItem('restoreSchemaData', JSON.stringify(schema));
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

    onRestoreClick() {
        this.scheme = this.restoreData;
        this.restoreData = null;
    }
}
