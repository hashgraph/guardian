import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { JsonToSchema, Schema, SchemaEntity, SchemaHelper, SchemaToJson } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MenuItem } from 'primeng/api';
import { SchemaService } from '../../../services/schema.service';
import { SchemaType } from '../../policy-engine/structures/types/schema-type.type';


/**
 * Dialog for creating and editing schemas.
 */
@Component({
    selector: 'schema-dialog',
    templateUrl: './schema-dialog.component.html',
    styleUrls: ['./schema-dialog.component.scss'],
})
export class SchemaDialog {
    public header: string;
    public type: 'new' | 'edit' | 'version' = 'new';
    public started: boolean = false;
    public schemaType: any = 'policy';
    public items: MenuItem[] = [
        { label: 'Simplified' },
        { label: 'Advanced' },
        { label: 'JSON' }
    ];
    public tab: number = 0;

    public id: string;
    public schema: Schema;
    public subSchemas: Schema[];
    public topicId: any;
    public policies: any[];
    public tools: any[];
    public properties: any[];
    public category: string;
    public document: string;

    public valid: boolean = true;
    public extended: boolean = false;
    public json: boolean = false;
    public error: any;

    public readonly codeMirrorOptions = {
        theme: 'default',
        mode: 'schema-json-lang',
        styleActiveLine: true,
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: [
            'CodeMirror-linenumbers',
            'CodeMirror-foldgutter',
            'CodeMirror-lint-markers'
        ],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readOnly: false,
        viewportMargin: Infinity
    };

    @ViewChild('schemaControl') schemaControl!: SchemaConfigurationComponent;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private cdr: ChangeDetectorRef,
        private schemaService: SchemaService,
    ) {
        const schema = this.config.data.scheme || null;
        this.header = this.config.header || '';
        this.type = this.config.data.type || null;
        this.schemaType = this.config.data.schemaType || 'policy';
        this.policies = this.config.data.policies || [];
        this.tools = this.config.data.tools || [];
        this.properties = this.config.data.properties || [];
        this.category = this.config.data.category;
        this.valid = true;
        this.tab = 0;
        this.extended = this.tab === 1;
        this.json = this.tab === 2;
        this.document = '';
        this.id = schema?.id;
        this.topicId = schema?.topicId || this.config.data.topicId || null;
    }

    ngOnInit(): void {
        this.loading(true);
        this.schemaService
            .getSchemaWithSubSchemas(this.category, this.id, this.topicId)
            .subscribe((data) => {
                this.setSubSchemas(this.topicId, this.id, data);
                this.loading(false);
            });
    }

    public get disabled(): boolean {
        return (!this.valid && !this.json) || !this.started;
    }

    public onClose() {
        this.ref.close(null);
    }

    public onCreate() {
        if (this.disabled) {
            return;
        }
        const schema = this.getSchemaDocument();
        if (!schema) {
            return;
        }
        this.ref.close({
            ...schema,
            context: null,
            fields: [],
            conditions: []
        });
    }

    private loading(value: boolean) {
        if (value) {
            this.started = false;
        } else {
            setTimeout(() => { this.started = true; }, 1000);
        }
    }

    public onChangeForm($event: SchemaConfigurationComponent) {
        this.valid = $event.isValid();
    }

    public onChangePolicy(topicId: string) {
        this.loading(true);
        this.topicId = topicId;
        this.schemaService
            .getSchemaWithSubSchemas(this.category, this.id, this.topicId)
            .subscribe((data) => {
                this.updateSubSchemas(this.topicId, this.id, data);
                this.loading(false);
            });
    }

    private setSubSchemas(topicId: string, schemaId: string, data: any) {
        this.topicId = topicId;
        this.subSchemas = SchemaHelper
            .map(data.subSchemas || [])
            .filter(schema => schema.id !== schemaId);
        if (data.schema) {
            this.schema = new Schema(data.schema);
        } else {
            this.schema = new Schema();
            this.schema.topicId = this.topicId;

            if (this.schemaType === SchemaType.System) {
                this.schema.system = true;
                this.schema.entity = SchemaEntity.STANDARD_REGISTRY;
            }
        }

        this.schemaControl.setData(this.schema, this.topicId);
        this.schemaControl.setSubSchemas(this.subSchemas);
        this.schemaControl.build();
    }

    private updateSubSchemas(topicId: string, schemaId: string, data: any) {
        this.topicId = topicId;
        this.subSchemas = SchemaHelper
            .map(data.subSchemas || [])
            .filter(schema => schema.id !== schemaId);

        this.schemaControl.setData(this.schema, this.topicId);
        this.schemaControl.setSubSchemas(this.subSchemas);
        this.cdr.detectChanges();
    }


    public onChangeTab($event: any, order: number): void {
        $event.stopPropagation();
        this.error = null;
        if (this.tab === order) {
            return;
        }
        if (order === 2 && this.tab !== 2) {
            if (!this.updateJsonView()) {
                return;
            }
        }
        if (order !== 2 && this.tab === 2) {
            if (!this.updateFormView()) {
                return;
            }
        }
        this.extended = order === 1;
        this.json = order === 2;
        this.tab = order;
    }

    private updateJsonView(): boolean {
        this.loading(true);
        try {
            this.document = this.schemaToJson();
            this.loading(false);
            return true;
        } catch (error) {
            console.error(error);
            this.document = '';
            this.loading(false);
            return true;
        }
    }

    private updateFormView(): boolean {
        let document: any;
        try {
            document = this.jsonToSchema(this.document, this.subSchemas);
        } catch (error) {
            this.error = (error as any)?.message?.toString() || error?.toString();
            return false;
        }
        this.loading(true);
        try {
            this.schema.name = document.name;
            this.schema.description = document.description;
            this.schema.entity = document.entity;
            this.schema.update(document.fields, document.conditions);
            this.schema.updateDocument();
            this.schema.updateRefs(this.subSchemas);

            this.schemaControl.setData(this.schema, this.topicId);
            this.schemaControl.setSubSchemas(this.subSchemas);
            this.schemaControl.build();

            this.loading(false);
            return true;
        } catch (error) {
            console.error(error);
            this.loading(false);
            return true;
        }
    }

    private getSchemaDocument() {
        if (this.json) {
            try {
                const document = this.jsonToSchema(this.document, this.subSchemas);
                if (!document) {
                    return null;
                }
                this.schema.name = document.name;
                this.schema.description = document.description;
                this.schema.entity = document.entity;
                this.schema.update(document.fields, document.conditions);
                this.schema.updateDocument();
                this.schema.updateRefs(this.subSchemas);

                this.schemaControl.setData(this.schema, this.topicId);
                this.schemaControl.setSubSchemas(this.subSchemas);
                this.schemaControl.build();

                if (this.schemaControl.isValid()) {
                    return this.schemaControl.getSchema();
                } else {
                    this.error = 'Invalid document';
                    return null;
                }
            } catch (error) {
                this.error = (error as any)?.message?.toString() || error?.toString();
                return null;
            }
        } else {
            return this.schemaControl.getSchema();
        }
    }

    public onChangeDocument($event: any) {
    }

    private schemaToJson(): string {
        try {
            const schema = this.schemaControl.getSchema();
            if (schema) {
                const json = SchemaToJson.schemaToJson(schema);
                return JSON.stringify(json, null, 4);
            } else {
                return '';
            }
        } catch (error) {
            console.error(error);
            return '';
        }

    }

    private jsonToSchema(json: string, all: Schema[]): any {
        const document = JSON.parse(json);
        const schema = JsonToSchema.fromJson(document, all);
        return schema;
    }
}
