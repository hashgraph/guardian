import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { ISchema, Schema, SchemaHelper } from '@guardian/interfaces';
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

    public schema: Schema;
    public subSchemas: Schema[];
    public topicId: any;
    public policies: any[];
    public modules: any[];
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
        this.header = this.config.header || '';
        this.schema = this.config.data.scheme || null;
        this.type = this.config.data.type || null;
        this.topicId = this.config.data.topicId || null;
        this.schemaType = this.config.data.schemaType || 'policy';
        this.policies = this.config.data.policies || [];
        this.modules = this.config.data.modules || [];
        this.tools = this.config.data.tools || [];
        this.properties = this.config.data.properties || [];
        this.category = this.config.data.category;
        this.valid = true;
        this.tab = 0;
        this.extended = this.tab === 1;
        this.json = this.tab === 2;
        this.document = '';
    }

    ngOnInit(): void {
        this.onLoadSubSchemas(this.topicId);
        this.loading(false);
    }

    public get disabled(): boolean {
        return !(this.valid && this.started);
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

    private setSubSchemas(topicId: string, schemaId: string, data: any) {
        if (data.schema) {
            this.schema = new Schema(data.schema);
        }

        this.subSchemas = SchemaHelper
            .map(data.subSchemas || [])
            .filter(schema => schema.id !== schemaId);

        this.topicId = topicId;

        this.updateFormData();
        this.loading(false);
    }

    private updateFormData() {
        this.schemaControl.mappingSubSchemas(this.subSchemas, this.topicId);
        setTimeout(() => this.schemaControl.updateFormControls(), 50);
    }

    public onChangeForm($event: SchemaConfigurationComponent) {
        this.valid = $event.isValid();
    }

    public onLoadSubSchemas(topicId: string) {
        const id = this.schema?.id;
        let schemaTopicId = topicId;
        if (this.schema?.topicId) {
            schemaTopicId = this.schema?.topicId;
        }

        this.schemaService
            .getSchemaWithSubSchemas(this.category, id, schemaTopicId)
            .subscribe((data) => {
                this.setSubSchemas(topicId, id, data);
            });
    }

    public onChangeTab(order: number): void {
        this.error = null;
        this.extended = order === 1;
        this.json = order === 2;
        if (this.json) {
            this.updateJsonView();
        } else if (this.tab === 2) {
            this.updateFormView();
        }
        this.tab = order;
    }

    private updateJsonView() {
        this.loading(true);
        try {
            const schema = this.schemaControl.getSchema();
            if (schema) {
                this.document = JSON.stringify(schema.document, null, 4);
            } else {
                this.document = '';
            }
            this.loading(false);
        } catch (error) {
            console.error(error);
            this.document = '';
            this.loading(false);
        }
    }

    private updateFormView() {
        this.loading(true);
        try {
            const document = JSON.parse(this.document);
            if (this.schema) {
                this.schema.setDocument(document);
            }
            this.schemaControl.reset();
            this.updateFormData();
            this.loading(false);
        } catch (error) {
            console.error(error);
            this.loading(false);
        }
    }

    private loading(value: boolean) {
        if (value) {
            this.started = false;
        } else {
            setTimeout(() => { this.started = true; }, 1000);
        }
    }

    private getSchemaDocument() {
        if (this.json) {
            try {
                const document = JSON.parse(this.document);
                if (this.schema) {
                    this.schema.setDocument(document);
                }
                this.schemaControl.reset();
                this.schemaControl.mappingSubSchemas(this.subSchemas, this.topicId);
                this.schemaControl.updateFormControls();
                if (this.schemaControl.isValid()) {
                    return this.schemaControl.getSchema();
                } else {
                    this.error = 'Invalid document';
                    return null;
                }
            } catch (error) {
                this.error = error?.toString();
                return null;
            }
        } else {
            return this.schemaControl.getSchema();
        }
    }

    public onChangeDocument($event: any) {
        // try {
        //     JSON.parse($event);
        //     this.valid = true;
        // } catch (error) {
        //     this.valid = false;
        // }
    }
}
