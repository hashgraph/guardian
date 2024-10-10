import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { ISchema, Schema, SchemaCategory, SchemaField, SchemaHelper } from '@guardian/interfaces';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MenuItem } from 'primeng/api';
import { SchemaService } from '../../../services/schema.service';

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

    public schemaType: any = 'policy';
    public valid: boolean = true;
    public extended: boolean = false;
    public fields: any[] = [];
    public restoreData: any = null;

    public policies: any[];
    public modules: any[];
    public tools: any[];
    public properties: any[];

    public category: string;
    public subSchemas: ISchema[];

    items: MenuItem[] = [{label: 'Simplified'}, {label: 'Advanced'}];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        private schemaService: SchemaService,
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

        this.category = this.config.data.category
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

        this.getSubSchemes()
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
        this.ref.close(
            {
                ...schema,
                fields: [],
                conditions: []
            }
        );
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

    getSubSchemes() {
        const { topicId, id} = this.scheme ?? {};

        this.schemaService.getSchemaWithSubSchemas(this.category, id, topicId).subscribe((data) => {
            this.subSchemas = data.subSchemas;

            if(this.scheme && data.schema) {
                this.scheme = new Schema(data.schema)

                setTimeout(()=>this.schemaControl.updateFormControls(), 50)
            }

            const subSchemas = SchemaHelper.map(data.subSchemas || []);

            this.schemaControl.mappingSubSchemas(subSchemas, topicId);
        });
    }
}
