import { ChangeDetectorRef, Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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

    public scheme: Schema;
    public started: boolean = false;
    public type: 'new' | 'edit' | 'version' = 'new';
    public topicId: any;
    public schemaType: any;
    public valid: boolean = true;
    public extended: boolean = false;
    public fields: any[] = [];
    public restoreData: any = null;

    public policies: any[];
    public modules: any[];
    public tools: any[];

    constructor(
        public dialogRef: MatDialogRef<SchemaDialog>,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.scheme = data.scheme || null;
        this.type = data.type || null;
        this.topicId = data.topicId || null;
        this.schemaType = data.schemaType || 'policy';
        this.policies = data.policies || [];
        this.modules = data.modules || [];
        this.tools = data.tools || [];
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
        try {
            localStorage.setItem('restoreSchemaData', JSON.stringify(schema));
        } catch (error) {
            console.error(error);
        }
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
