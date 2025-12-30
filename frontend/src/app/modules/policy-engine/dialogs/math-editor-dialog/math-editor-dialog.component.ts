import { AfterContentInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Schema, SchemaField } from '@guardian/interfaces';
import { MathLiveComponent } from 'src/app/modules/common/mathlive/mathlive.component';
import { FieldLinkDialog } from '../field-link-dialog/field-link-dialog.component';
import { Context } from './model/context';
import { Group } from './model/group';
import { FieldLink } from './model/link';
import { Formula } from './model/formula';
import { SchemaVariables } from '../../structures';
import { Code } from './model/code';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { TreeListData, TreeListView } from 'src/app/modules/common/tree-graph/tree-list';
import { FieldData } from 'src/app/modules/common/models/schema-node';

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
    @ViewChild('contextBody', { static: true }) contextBodyRef: ElementRef;

    public expression!: string;
    public initDialog = false;
    public loading = true;
    public data: any;
    public test = false;
    public block: any;
    public properties: any;
    public policyId: string;

    public scope: Group;

    public keyboard: boolean = false;

    public schema: Schema | undefined;
    private schemas: SchemaVariables[];
    private schemasName: string = '';
    private schemasFieldMap: Map<string, SchemaField> = new Map<string, SchemaField>();

    public code: Code;

    public step: string = 'step_1';
    public codeTab: string = 'general';

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
    context: Context | null;
    private codeEditor: any;

    public dataType: string = 'schema';
    public fileExtension = 'json';
    public fileLabel = 'Add json .json file';
    public fileBuffer: any;
    public error: any;
    public schemaValue: UntypedFormGroup;
    public jsonValue: string;
    public fileValue: any;
    public _value: any;

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

    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogService: DialogService,
        private config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
    ) {
        this.data = this.config.data;
        this.scope = new Group();
        this.code = new Code();
        this.tooltip = new Tooltip({
            container: window.document.body,
            check: (el: any) => {
                return el.classList.contains('cm-block-code-link-highlight');
            },
            text: (el: any) => {
                for (const className of el.classList) {
                    if (className.startsWith('cm-path-')) {
                        return this.getFieldName(className.substring(8));
                    }
                }
                return '';
            },
        })

        // this.scope.addVariable();
        //         this.scope.addFormula('x', '1');
        //         this.scope.addFormula('y', 'x + 10');
        //         this.scope.addFormula('z(a, b)', 'a + b');
        //         this.scope.addFormula('r', 'z(x, y) + 1');
        //         this.code.text =
        // `
        // //Registrant Id
        // const m = getField('f1');
        // document.field0 = 5;
        // const y = { 
        //     context: this, 
        //     document: document, 
        //     formulas: formulas, 
        //     variables: variables, 
        //     m:m, 
        //     z: formulas['z'](1, 2),
        //     Array:Array,
        //     n: NaN,
        //     t: typeof ''
        // }
        // `;
    }

    ngOnInit() {
        this.initDialog = false;
        this.loading = true;
        this.policyId = this.data.policyId;
        this.expression = this.data.expression;
        this.test = this.data.test;
        this.block = this.data.block;
        this.properties = this.block.properties;
        this.schemas = this.data.schemas;
        this.schema = this.schemas?.find((v) => v.value === this.properties?.inputSchema)?.data;
        this.schemaValue = this.fb.group({});
        this.jsonValue = '';
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

    public onSave(): void {
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

    public onKeyboardFocus($event: MathLiveComponent) {
        // setTimeout(() => {
        //     if (this.keyboard) {
        //         const focus = $event.getElement();
        //         const scroll = this.contextBodyRef;
        //         const targetRect = focus.nativeElement.getBoundingClientRect();
        //         const scrollRect = scroll.nativeElement.getBoundingClientRect();
        //         const y = targetRect.y - scrollRect.y;
        //         const height = scrollRect.height;
        //         const d = y - height + 60;
        //         if (d > 0) {
        //             scroll.nativeElement.scrollTop += d;
        //         }
        //     }
        // });
    }

    public deleteFormula(formula: Formula) {
        this.scope.deleteFormula(formula);
    }

    public deleteVariable(variable: FieldLink) {
        this.scope.deleteVariable(variable);
    }

    public deleteOutput(output: FieldLink) {
        this.scope.deleteOutput(output);
    }

    public addFormula() {
        this.scope.addFormula();
    }

    public addVariable() {
        this.scope.addVariable();
    }

    public addOutput() {
        this.scope.addOutput();
    }

    private updateSchema() {
        this.schemasName = '';
        this.schemasFieldMap.clear();
        if (this.schema) {
            this.schemasName = String(this.schema.name || '');
            const fields = this.schema.getFields();
            for (const field of fields) {
                this.schemasFieldMap.set(String(field.path), field);
            }
            this.codeMirrorOptions.links = this.createLinks(this.schema);
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
                    // pattern: new RegExp('^' + field.path)
                    pattern: new RegExp('^' + pattern)
                })
                this._createLinks(field.fields, links, field, pattern);
            }
        }
    }

    private createSchemaView(schema: any) {
        const fields = TreeListData.fromObject<FieldData>(schema, 'fields', (item) => {
            item.id = item.data?.path;
            item.name = item.data?.description;
            return item;
        });
        const items = TreeListView.createView(fields, (s) => { return !s.parent });
        items.setSearchRules((item) => [`(${item.description || ''})`.toLocaleLowerCase()]);
        return items;
    }

    public onLink(item: FieldLink) {
        if (!this.schema) {
            return;
        }
        const dialogRef = this.dialogService.open(FieldLinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                title: this.schema?.name || 'Set Link',
                value: item.field,
                view: this.createSchemaView(this.schema),
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                item.field = result.value;
                item.update();
            }
        });
    }

    public getEntityName(link: string): string {
        return this.schemasName || '';
    }

    public getFieldName(link: string): string {
        return this.schemasFieldMap.get(link)?.description || '';
    }

    public getFieldType(link: string): string {
        return this.schemasFieldMap.get(link)?.fullType || '';
    }

    public getFieldPath(link: string): string {
        return this.schemasFieldMap.get(link)?.path || '';
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

    public onStep(step: string) {
        this.error = null;
        this.loading = false;
        try {
            this._value = this.getJsonValue();
        } catch (error) {
            console.error(error);
            this.error = error?.toString();
            return;
        }
        this.step = step;
        this.setValue(this._value);
        this.loading = true;
        setTimeout(() => {
            this.loading = false;
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
        if (this.scope) {
            this.scope.validate();
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
        if (!this.schema) {
            return;
        }
        const dialogRef = this.dialogService.open(FieldLinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                title: this.schema?.name || 'Set Link',
                view: this.createSchemaView(this.schema),
            },
        });
        dialogRef.onClose.subscribe((result: any | null) => {
            if (result) {
                const cursor = this.getCursor();
                const type = this.getFieldType(result.value);
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
        if (!this.scope) {
            return;
        }
        this.scope.validate();
        const context = this.scope.createContext();
        const components = context?.getComponents() || [];
        const data = TreeListData.fromObject<any>({ components }, 'components', (item) => {
            if (item.data) {
                item.id = item.data.value;
                item.name = item.data.name;
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
            data: {
                title: 'Select components',
                view: this.createComponentView(),
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

    public importFromFile(event: any) {
        const reader = new FileReader()
        reader.readAsText(event);
        reader.addEventListener('load', (e: any) => {
            this.fileBuffer = e.target.result;
            this.fileValue = JSON.parse(this.fileBuffer);
        });
    }

    public initForm($event: any) {
        this.schemaValue = $event;
    }

    private getJsonValue() {
        switch (this.dataType) {
            case 'schema':
                return this.schemaValue.value;
            case 'json':
                const json = JSON.parse(this.jsonValue);
                return json;
            case 'file':
                return this.fileValue;
            default:
                return this._value;
        }
    }

    private setValue(value: any) {
        switch (this.dataType) {
            case 'schema':
                this._value = value;
                this.schemaValue.setValue(value);
                break;
            case 'json':
                this._value = value;
                try {
                    this.jsonValue = JSON.stringify(value, null, 4);
                } catch (error) {
                    console.error(error)
                }
                break;
            case 'file':
                this._value = value;
                try {
                    this.fileValue = JSON.stringify(value, null, 4);
                } catch (error) {
                    console.error(error)
                }
                break;
            default:
                this._value = value;
                break;
        }
    }

    private getValue() {
        switch (this.dataType) {
            case 'schema':
                return this.schemaValue.value;
            case 'json':
                try {
                    const json = JSON.parse(this.jsonValue);
                    return json;
                } catch (error) {
                    console.error(error)
                    return null;
                }
            case 'file':
                return this.fileValue;
            default:
                return null;
        }
    }

    public onTest(): void {
        try {
            this.loading = true;
            this.result = null;
            const doc = this.getValue();

            if (!this.scope) {
                this.loading = false;
                this.error = 'Invalid config';
                return;
            }

            this.context = this.scope.createContext();
            if (!this.context) {
                this.loading = false;
                this.error = 'Invalid config';
                for (const element of this.scope.variables) {
                    if (element.invalid && !element.empty) {
                        this.onStep('step_1');
                        return;
                    }
                }
                for (const element of this.scope.formulas) {
                    if (element.invalid && !element.empty) {
                        this.onStep('step_2');
                        return;
                    }
                }
                for (const element of this.scope.outputs) {
                    if (element.invalid && !element.empty) {
                        this.onStep('step_3');
                        return;
                    }
                }
                return;
            }

            this.context.setDocument(doc);
            const context = this.context.getContext();
            context.document = doc;

            const variables = this.scope.variables;
            const formulas = this.scope.formulas;
            const outputs = this.scope.outputs;
            for (const item of this.scope.items) {
                item.value = context.scope[item.name];
            }

            let input: string = '';
            try {
                input = doc ? JSON.stringify(doc, null, 4) : '';
            } catch (error) {
                input = '';
            }

            let builtCode: Function;
            try {
                this.code.setContext(context);
                builtCode = this.code.build();
                const output = builtCode();
                let _output: string = '';
                try {
                    _output = doc ? JSON.stringify(output, null, 4) : '';
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
}
