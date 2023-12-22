import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { Schema } from '@guardian/interfaces';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MenuItem } from 'primeng/api';

/**
 * Dialog for creating and editing schemas.
 */
@Component({
    selector: 'schema-dialog',
    templateUrl: './schema-dialog.component.html',
    styleUrls: ['./schema-dialog.component.scss'],
})
export class SchemaDialog {
    @ViewChild('document') schemaControl!: SchemaConfigurationComponent;

    public scheme: Schema;
    public schemasMap: any;
    public started: boolean = false;
    public type: 'new' | 'edit' | 'version' = 'new';
    public topicId: any;

    public schemaType: string = 'policy';
    public valid: boolean = true;
    public extended: boolean = false;
    public fields: any[] = [];
    public restoreData: any = null;

    public policies: any[];
    public modules: any[];
    public tools: any[];
    public properties: any[];

    items: MenuItem[] = [{label: 'Simplified'}, {label: 'Advanced'}];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef
    ) {
        this.schemasMap = this.config.data.schemasMap || {};
        this.scheme = this.config.data.scheme || null;
        this.type = this.config.data.type || null;
        this.topicId = this.config.data.topicId || null;
        this.schemaType = this.config.data.schemaType || 'policy';
        this.policies = this.config.data.policies || [];
        this.modules = this.config.data.modules || [];
        this.tools = this.config.data.tools || [];
        this.properties = this.config.data.properties || [];
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

    handleChangeTab(order: number): void {
        this.extended = order === 1;
    }

    getDocument(schema: Schema | null) {
        this.ref.close(schema);
    }

    onClose() {
        this.ref.close(null);
    }

    onCreate() {
        if (!(this.valid && this.started)) {
            return;
        }
        const schema = this.schemaControl?.getSchema();
        try {
            localStorage.setItem('restoreSchemaData', JSON.stringify(schema));
        } catch (error) {
            console.error(error);
        }
        this.ref.close(schema);
    }

    onChangeForm(schemaControl: SchemaConfigurationComponent) {
        this.valid = schemaControl.isValid();
    }

    onChangeFields(fields: any[]) {
        this.fields = fields;
        this.cdr.detectChanges();
    }

    drop(event: CdkDragDrop<any[]>) {
        moveItemInArray(
            event.container.data,
            event.previousIndex,
            event.currentIndex
        );
    }

    onRestoreClick() {
        this.scheme = this.restoreData;
        this.restoreData = null;
    }
}
