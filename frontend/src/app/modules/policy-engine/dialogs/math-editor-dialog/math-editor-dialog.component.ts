import { AfterContentInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Schema, SchemaField } from '@guardian/interfaces';
import { MathLiveComponent } from 'src/app/modules/common/mathlive/mathlive.component';
import { FieldLinkDialog } from '../field-link-dialog/field-link-dialog.component';
import { SchemaVariables } from '../../structures';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TreeListData, TreeListView } from 'src/app/modules/common/tree-graph/tree-list';
import { FieldData } from 'src/app/modules/common/models/schema-node';
import { Code, FieldLink, MathContext, MathFormula, MathEngine, setDocumentValueByPath, DocumentMap } from './math-model/index';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MathGroups } from './math-model/math-groups';
import { MathGroup } from './math-model/math-group';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { DataInputDialogComponent } from 'src/app/modules/common/data-input-dialog/data-input-dialog.component';
import { AddDocumentDialog } from '../add-document-dialog/add-document-dialog.component';

class Tooltip {
    public visible: boolean;
    public text: string;
    public x: number;
    public y: number;

    private _last: any;
    private _check: (el: any) => boolean;
    private _text: (el: any) => string;
    private _container: any;
    private _body: any;
    private _textContainer: any;

    constructor(options: {
        container: any,
        check: (el: any) => boolean,
        text: (el: any) => string,
    }) {
        this._container = options.container;
        this._check = options.check;
        this._text = options.text;
        this._last = null;
        this.text = '';
        this.x = -1;
        this.y = -1;
        this.create();
    }

    private create() {
        this._body = document.createElement('div');
        this._body.classList.add('guardian-dynamic-tooltip');
        this._body.classList.add('hidden-tooltip');

        const container = document.createElement('div');
        container.classList.add('guardian-dynamic-tooltip-body');
        this._body.appendChild(container);

        this._textContainer = document.createElement('div');
        this._textContainer.classList.add('guardian-dynamic-tooltip-text');
        container.appendChild(this._textContainer);

        this._container.appendChild(this._body);
    }

    public hover(el: any) {
        if (this._last === el) {
            return;
        }
        if (el && this._check(el)) {
            this.show(el);
        } else {
            this.hide();
        }
    }

    public show(el: any) {
        this.visible = true;
        this.text = this._text(el);

        const pos = el.getBoundingClientRect();
        this.x = pos.left;
        this.y = pos.top;
        this._textContainer.textContent = this.text;
        this._body.classList.toggle('hidden-tooltip', false);
        this._body.style.top = `${this.y}px`;
        this._body.style.left = `${this.x + pos.width / 2}px`;
    }

    public hide() {
        this.visible = false;
        this.text = '';
        this.x = -1;
        this.y = -1;
        this._body.classList.toggle('hidden-tooltip', true);
    }

    public destroy() {
        this._container.removeChild(this._body);
    }
}

/**
 * Dialog.
 */
@Component({
    selector: 'math-editor-dialog',
    templateUrl: './math-editor-dialog.component.html',
    styleUrls: ['./math-editor-dialog.component.scss']
})
export class MathEditorDialogComponent implements OnInit, AfterContentInit {
    @ViewChild('contextBody', { static: false }) contextBodyRef: ElementRef;

    public expression!: any;
    public initDialog = false;
    public loading = true;
    public data: any;
    public test = false;
    public block: any;
    public properties: any;
    public policyId: string;

    public engine: MathEngine;
    public code: Code;

    public inputSchema: Schema | undefined;
    public outputSchema: Schema | undefined;

    private schemas: Schema[];
    private inputSchemaName: string = '';
    private outputSchemaName: string = '';
    private schemaNames: Map<string, string> = new Map<string, string>();
    private schemaFieldMap: Map<string, Map<string, SchemaField>> = new Map<string, Map<string, SchemaField>>();
    private inputSchemaFieldMap: Map<string, SchemaField> = new Map<string, SchemaField>();
    private outputSchemaFieldMap: Map<string, SchemaField> = new Map<string, SchemaField>();

    public keyboard: boolean = false;
    public step: string = 'step_1';
    public codeTab: string = 'general';
    public collapseHelp: boolean = false;

    public codeMirrorOptions: any = {
        theme: 'default',
        mode: 'block-code-lang',
        styleActiveLine: true,
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: false,
        gutters: [
            'CodeMirror-linenumbers',
        ],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readonly: false,
        autoFocus: true,
    };
    private context: MathContext | null;
    private codeEditor: any;
    public error: any;
    public resultStep: string;
    public result: any;
    public codeMirrorOptions2: any = {
        theme: 'default',
        mode: 'javascript',
        styleActiveLine: true,
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: false,
        gutters: [
            'CodeMirror-linenumbers',
        ],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readonly: true,
        autoFocus: true
    };
    public tooltip: Tooltip;
    public readonly: boolean = false;

    public inputDocumentValue: any = null;
    public inputRelationshipsValue: any[] = [];

    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogService: DialogService,
        private config: DynamicDialogConfig,
        private el: ElementRef,
    ) {
        this.data = this.config.data;
        this.engine = new MathEngine();
        this.code = new Code();
        this.tooltip = new Tooltip({
            container: window.document.body,
            check: (el: any) => {
                return el.classList.contains('cm-block-code-link-highlight');
            },
            text: (el: any) => {
                for (const className of el.classList) {
                    if (className.startsWith('cm-path-')) {
                        const type = el.classList.contains('cm-type-result') ? 'output' : 'input';
                        return this.getFieldName(type, null, className.substring(8));
                    }
                }
                return '';
            },
        })
    }

    ngOnInit() {
        this.initDialog = false;
        this.loading = true;
        this.readonly = this.data.readonly;
        this.policyId = this.data.policyId;
        this.expression = this.data.expression;
        this.test = this.data.test;
        this.block = this.data.block;
        this.properties = this.block.properties;
        this.schemas = this.data.schemas?.filter((v: SchemaVariables) => v.data)?.map((v: SchemaVariables) => v.data) || [];
        this.inputSchema = this.data.schemas?.find((v: SchemaVariables) => v.value === this.properties?.inputSchema)?.data;
        this.outputSchema = this.data.schemas?.find((v: SchemaVariables) => v.value === this.properties?.outputSchema)?.data;
        if (!this.properties?.outputSchema) {
            this.outputSchema = this.inputSchema;
        }
        this.code.from(this.expression);
        this.engine.from(this.expression);
        this.engine.validate();
        this.updateSchema();
    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, 100);
    }

    ngOnDestroy(): void {
        this.tooltip.destroy();
    }

    public get variables() {
        return this.engine.variables.view;
    }

    public get formulas() {
        return this.engine.formulas.view;
    }

    public get outputs() {
        return this.engine.outputs.view;
    }

    public onFullscreen() {
        this.el.nativeElement.classList.toggle('fullscreen');
        this.el.nativeElement.parentElement.parentElement.classList.toggle('fullscreen');
    }

    public onSave(): void {
        if (this.engine) {
            const error = this.engine.validate();
            if (error) {
                if (error[0] === 'variables') {
                    this.onStep('step_1', error[1], '.rows-container[error="true"]');
                    return;
                } else if (error[0] === 'formulas') {
                    this.onStep('step_2', error[1], '.rows-container[error="true"]');
                    return;
                } else if (error[0] === 'outputs') {
                    this.onStep('step_3', error[1], '.rows-container[error="true"]');
                    return;
                }
            }
        }

        this.expression = {
            ...this.engine.toJson(),
            ...this.code.toJson()
        };

        this.dialogRef.close({
            type: 'save',
            expression: this.expression
        });
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }

    public onKeyboard($event: boolean) {
        this.keyboard = $event;
    }

    public deleteFormula(formula: MathFormula) {
        this.engine.deleteFormula(formula);
    }

    public deleteVariable(variable: FieldLink) {
        this.engine.deleteVariable(variable);
    }

    public deleteOutput(output: FieldLink) {
        this.engine.deleteOutput(output);
    }

    public addFormula() {
        this.engine.addFormula();
    }

    public addVariable() {
        this.engine.addVariable();
    }

    public addOutput() {
        this.engine.addOutput();
    }

    private updateSchema() {
        this.inputSchemaFieldMap.clear();
        this.outputSchemaFieldMap.clear();

        this.schemaNames.clear();
        this.schemaFieldMap.clear();
        for (const schema of this.schemas) {
            this.schemaNames.set(String(schema.iri || ''), String(schema.name || ''));
            const fields = schema.getFields();
            const map = new Map<string, SchemaField>();
            for (const field of fields) {
                map.set(String(field.path), field);
            }
            this.schemaFieldMap.set(String(schema.iri || ''), map);
        }
        this.schemaNames.set('#GeoJSON', 'GeoJSON');

        if (this.inputSchema) {
            this.inputSchemaName = String(this.inputSchema.name || '');

            const fields = this.inputSchema.getFields();
            for (const field of fields) {
                this.inputSchemaFieldMap.set(String(field.path), field);
            }

            this.codeMirrorOptions.inputLinks = this.createLinks(this.inputSchema);
        }
        if (this.outputSchema) {
            this.outputSchemaName = String(this.outputSchema.name || '');

            const fields = this.outputSchema.getFields();
            for (const field of fields) {
                this.outputSchemaFieldMap.set(String(field.path), field);
            }

            this.codeMirrorOptions.outputLinks = this.createLinks(this.outputSchema);
        }
    }

    private createLinks(schema: Schema): any[] {
        const links: any[] = [];
        this._createLinks(schema.fields, links, null, '');
        links.sort((a, b) => a.path.length > b.path.length ? 1 : -1);
        return links;
    }

    private _createLinks(
        fields: SchemaField[] | undefined,
        links: any[],
        parent: SchemaField | null,
        parentPattern: string | null
    ) {
        if (Array.isArray(fields)) {
            for (const field of fields) {
                let pattern: string;
                if (parent) {
                    if (parent.isArray) {
                        pattern = `${parentPattern}\\[\\w+\\].${field.name}`;
                    } else {
                        pattern = `${parentPattern}.${field.name}`;
                    }
                } else {
                    pattern = `${field.name}`;
                }
                links.push({
                    path: field.path,
                    pattern: new RegExp('^' + pattern)
                });
                if (field.isArray) {
                    links.push({
                        path: field.path,
                        pattern: new RegExp('^' + pattern + '\\[\\w+\\]')
                    });
                }
                this._createLinks(field.fields, links, field, pattern);
            }
        }
    }

    private createSchemaView(schema: any) {
        const fields = TreeListData.fromObject<FieldData>(schema, 'fields', (item) => {
            if (item && item.data) {
                let type = item.data.isRef ? this.schemaNames.get(item.data.type) : item.data.type;
                if (type === null || type === 'null') {
                    type = 'Help Text';
                }
                item.id = item.data.path;
                item.name = item.data.description;
                item.subName = `${item.id} (${type})`;
            }
            return item;
        });
        const items = TreeListView.createView(fields, (s) => { return !s.parent });
        items.setSearchRules((item) => [
            `(${item.description || ''})`.toLocaleLowerCase(),
            `(${item.path || ''})`.toLocaleLowerCase()
        ]);
        return items;
    }

    public onInputLink(item: FieldLink) {
        const schema = this.inputSchema;
        if (!schema) {
            return;
        }
        const view = this.createSchemaView(schema);

        const groups = [];
        const schemas = this.schemas.filter((s) => s !== this.inputSchema && s.entity !== 'NONE');
        for (const item of schemas) {
            groups.push({
                id: item.iri,
                name: item.name,
                subName: item.iri,
                view: this.createSchemaView(item),
                highlighted: false,
                searchHighlighted: false,
            })
        }
        groups.unshift({
            id: schema.iri,
            name: schema.name,
            subName: schema.iri,
            view: view,
            highlighted: true,
            searchHighlighted: false,
        })

        const dialogRef = this.dialogService.open(FieldLinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            focusOnClose: false,
            data: {
                title: ['Select Schema', 'Select Field'],
                value: item.field,
                group: item.schema,
                view,
                groups
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                item.field = result.value;
                item.schema = result.group || schema?.iri || null;
                item.update();
            }
        });
    }

    public onOutputLink(item: FieldLink) {
        const schema = this.outputSchema;
        if (!schema) {
            return;
        }
        const dialogRef = this.dialogService.open(FieldLinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            focusOnClose: false,
            data: {
                title: 'Select Field',
                value: item.field,
                view: this.createSchemaView(schema),
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                item.field = result.value;
                item.schema = schema?.iri || null;
                item.update();
            }
        });
    }

    public getEntityName(type: 'input' | 'output', schema: string | null): string {
        if (type === 'input') {
            if (schema) {
                return this.schemaNames.get(schema) || '';
            } else {
                return this.inputSchemaName;
            }
        } else {
            if (schema) {
                return this.schemaNames.get(schema) || '';
            } else {
                return this.outputSchemaName;
            }
        }
    }

    private getField(type: 'input' | 'output', schema: string | null, link: string) {
        if (schema) {
            return this.schemaFieldMap.get(schema)?.get(link);
        }
        if (type === 'input') {
            return this.inputSchemaFieldMap.get(link);
        } else {
            return this.outputSchemaFieldMap.get(link);
        }
    }

    public getFieldName(type: 'input' | 'output', schema: string | null, link: string): string {
        const field = this.getField(type, schema, link);
        return field?.description || '';
    }

    public getFieldType(type: 'input' | 'output', schema: string | null, link: string): string {
        const field = this.getField(type, schema, link);
        return field?.fullType || '';
    }

    public getFieldPath(type: 'input' | 'output', schema: string | null, link: string): string {
        const field = this.getField(type, schema, link);
        return field?.path || '';
    }

    public getItemValue(value: any) {
        if (value === undefined || value === null) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    public deleteLink(item: FieldLink, $event: any) {
        $event.preventDefault();
        $event.stopPropagation();
        item.field = null;
    }

    public onStep(
        step: string,
        page?: string,
        target?: string
    ) {
        this.step = step;
        this.loading = true;
        if (page) {
            this.engine.variables.selectById(page);
            this.engine.formulas.selectById(page);
            this.engine.outputs.selectById(page);
        }
        setTimeout(() => {
            this.loading = false;
            if (target) {
                this.el.nativeElement
                    ?.querySelector(target)
                    ?.scrollIntoView();
            }
        }, 500);
    }

    public getHeader(step: string) {
        switch (step) {
            case 'step_1':
                return 'Inputs';
            case 'step_2':
                return 'Formulas';
            case 'step_3':
                return 'Outputs';


            case 'step_4':
                return 'Inputs';
            case 'step_5':
                return 'Results';
            default:
                return null;
        }
    }

    public onChangeCode() {
    }

    public onValidate() {
        if (this.engine) {
            const error = this.engine.validate();
            if (error) {
                if (error[0] === 'variables') {
                    this.onStep('step_1', error[1], '.rows-container[error="true"]');
                    return;
                } else if (error[0] === 'formulas') {
                    this.onStep('step_2', error[1], '.rows-container[error="true"]');
                    return;
                } else if (error[0] === 'outputs') {
                    this.onStep('step_3', error[1], '.rows-container[error="true"]');
                    return;
                }
            }
        }
    }

    private indexOf(text: string, item: string, offset: number): number {
        let index = text.indexOf(item);
        for (let i = 0; i < offset; i++) {
            index = text.indexOf(item, index + 1);
        }
        return index;
    }

    private getCursor() {
        if (!this.code?.text) {
            return 0;
        }
        if (this.codeEditor) {
            const cursor = this.codeEditor.getCursor();
            let index = this.indexOf(this.code.text, '\n', cursor.line - 1);
            index = index + cursor.ch + 1;
            return index;
        }
        return this.code.text.length;
    }

    public addVariableLink() {
        if (!this.inputSchema) {
            return;
        }
        const dialogRef = this.dialogService.open(FieldLinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            focusOnClose: false,
            data: {
                title: this.inputSchema?.name || 'Set Link',
                view: this.createSchemaView(this.inputSchema),
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                const cursor = this.getCursor();
                const type = this.getFieldType('input', null, result.value);
                let text = '';
                text = text + '\r\n';
                text = text + `//${result.fullName}` + '\r\n';
                text = text + `//${type}` + '\r\n';
                text = text + `const _ /*name*/ = getField('${result.value}');` + '\r\n';
                text = text + '\r\n';

                this.code.text = this.code.text.slice(0, cursor) + text + this.code.text.slice(cursor);
            }
        });
    }

    private createComponentView() {
        if (!this.engine) {
            return;
        }
        this.engine.validate();
        const components = this.engine.getComponents();
        const data = TreeListData.fromObject<any>({ components }, 'components', (item) => {
            if (item.data) {
                item.id = item.data.value;
                item.name = item.data.name;
                item.subName = item.data.value;
            }

            return item;
        });
        const items = TreeListView.createView(data, (s) => { return !s.parent });
        items.setSearchRules((item) => [`(${item.name || ''})`.toLocaleLowerCase()]);
        return items;
    }

    public addComponent() {
        const dialogRef = this.dialogService.open(FieldLinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            focusOnClose: false,
            data: {
                title: 'Select components',
                view: this.createComponentView(),
                subName: false
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                const cursor = this.getCursor();
                const text = ` ${result.value} `;
                this.code.text = this.code.text.slice(0, cursor) + text + this.code.text.slice(cursor);
            }
        });
    }

    public onCodeChangeTab(tab: any) {
        this.codeTab = tab.index === 0 ? 'general' : 'advanced';
    }

    public cursorActivity($event: any) {
        this.codeEditor = $event;
    }

    public addInputDocument() {
        const dialogRef = this.dialogService.open(AddDocumentDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            focusOnClose: false,
            data: {
                schemas: null,
                schema: this.inputSchema,
                policyId: this.policyId
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                this.inputDocumentValue = result;
            }
        });
    }

    public addRelationships() {
        const schemas = this.schemas.filter((s) => s !== this.inputSchema && s.entity !== 'NONE');
        const dialogRef = this.dialogService.open(AddDocumentDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            focusOnClose: false,
            data: {
                schemas: schemas,
                schema: null,
                policyId: this.policyId
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                this.inputRelationshipsValue.push(result);
            }
        });
    }

    public editInputDocument(item: any) {
        const schema = this.schemas.find((s) => s.iri === item.schema);
        const dialogRef = this.dialogService.open(AddDocumentDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            focusOnClose: false,
            data: {
                schema: schema,
                policyId: this.policyId,
                value: item.value
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                item.value = result.value;
            }
        });
    }

    public deleteInputDocument(item: any) {
        if (this.inputDocumentValue === item) {
            this.inputDocumentValue = null;
        }
        this.inputRelationshipsValue = this.inputRelationshipsValue.filter((e) => e !== item);
    }

    private getValue() {
        const documents = new DocumentMap();
        documents.addDocument(this.inputDocumentValue);
        documents.addRelationships(this.inputRelationshipsValue);
        return documents;
    }

    public onTest(): void {
        try {
            this.loading = true;
            this.result = null;
            this.error = null;

            const inputDocuments = this.getValue();
            const inputDocument = inputDocuments.getCurrent();

            if (!this.engine) {
                this.loading = false;
                this.error = 'Invalid config';
                return;
            }

            this.context = this.engine.createContext();
            if (!this.context) {
                this.loading = false;
                this.error = 'Invalid config';
                for (const page of this.engine.variables.pages) {
                    for (const element of page.items) {
                        if (element.invalid && !element.empty) {
                            this.onStep('step_1', page.name);
                            return;
                        }
                    }
                }
                for (const page of this.engine.formulas.pages) {
                    for (const element of page.items) {
                        if (element.invalid && !element.empty) {
                            this.onStep('step_2', page.name);
                            return;
                        }
                    }
                }
                for (const page of this.engine.outputs.pages) {
                    for (const element of page.items) {
                        if (element.invalid && !element.empty) {
                            this.onStep('step_3', page.name);
                            return;
                        }
                    }
                }
                return;
            }

            this.context.setDocument(inputDocuments);
            const context = this.context.getContext();

            const variables = this.engine.variables.getItems();
            const formulas = this.engine.formulas.getItems();
            const outputs = this.engine.outputs.getItems();
            const all = this.engine.getItems();
            for (const item of all) {
                item.value = context.scope[item.name];
            }

            let input: string = '';
            try {
                input = inputDocument ? JSON.stringify(inputDocument, null, 4) : '';
            } catch (error) {
                input = '';
            }

            let outputDocument: any;
            if (this.inputSchema?.iri === this.outputSchema?.iri) {
                outputDocument = inputDocument;
            } else {
                outputDocument = {};
            }

            for (const link of outputs) {
                try {
                    setDocumentValueByPath(this.outputSchema, outputDocument, link.path, context.scope[link.name]);
                    link.value = context.scope[link.name];
                } catch (error) {
                    console.log(error);
                    link.value = String(error);
                }
            }

            let builtCode: Function;
            try {
                context.document = inputDocument;
                context.result = outputDocument;
                context.user = {};
                this.code.setContext(context);
                builtCode = this.code.build();
                const output = builtCode();
                let _output: string = '';
                try {
                    _output = output ? JSON.stringify(output, null, 4) : '';
                } catch (error) {
                    _output = '';
                }
                this.result = {
                    valid: true,
                    error: '',
                    variables: variables,
                    formulas: formulas,
                    outputs: outputs,
                    input: input,
                    output: _output
                }
                this.resultStep = 'output';
            } catch (error) {
                this.error = 'Invalid code';
                this.result = {
                    valid: true,
                    error: String(error),
                    variables: variables,
                    formulas: formulas,
                    outputs: outputs,
                    input: input,
                    output: ''
                }
                this.resultStep = 'errors';
            }
            this.loading = false;
            this.onStep('step_5');
        } catch (error) {
            this.loading = false;
            this.error = 'Invalid config';
            return;
        }
    }

    public onResultStep(step: string) {
        this.resultStep = step;
    }

    @HostListener('mousemove', ['$event'])
    onMouseEnter($event: any) {
        if (!$event || this.step !== 'step_2' || this.codeTab !== 'advanced') {
            return;
        }
        this.tooltip.hover($event.target);
    }

    public reorder(type: 'variables' | 'formulas' | 'outputs', event: CdkDragDrop<any[]>) {
        this.engine.reorder(type, event.previousIndex, event.currentIndex);
    }

    public onChangeView(item: MathFormula, $event: any) {
        item.view = $event;
    }

    public onRenamePage(pages: MathGroups<any>, $event: MathGroup<any>) {
        const dialogRef = this.dialogService.open(DataInputDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                fieldsConfig: [
                    {
                        name: 'name',
                        label: 'Name',
                        placeholder: 'Name',
                        validators: [Validators.required],
                        initialValue: $event.name
                    },
                ],
                title: 'Rename',
                button: 'Save'
            },
        });
        dialogRef.onClose.subscribe(async (result: any) => {
            if (!result) {
                return;
            }
            $event.name = result.name?.trim();
        });
    }

    public onDeletePage(pages: MathGroups<any>, $event: MathGroup<any>) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete tab',
                text: 'Are you sure want to delete tab?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                pages.delete($event);
            }
        });
    }
}
