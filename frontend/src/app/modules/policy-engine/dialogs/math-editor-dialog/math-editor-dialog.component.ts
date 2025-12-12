import { AfterContentInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Schema, SchemaField } from '@guardian/interfaces';
import { MathLiveComponent } from 'src/app/modules/common/mathlive/mathlive.component';
import { FieldLinkDialog } from '../field-link-dialog/field-link-dialog.component';
import { Formula, Group, Link } from './models';
import { SchemaVariables } from '../../structures';

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

    public scope: Group;

    public keyboard: boolean = false;

    private schemas: SchemaVariables[];
    private schema: Schema | undefined;
    private schemasName: string = '';
    private schemasFieldMap: Map<string, SchemaField> = new Map<string, SchemaField>();

    public code: string = '';

    public step: string = 'formulas';

    public codeMirrorOptions: any = {
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
        readonly: false,
        autoFocus: true
    };

    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogService: DialogService,
        private config: DynamicDialogConfig,
    ) {
        this.data = this.config.data;
        this.scope = new Group();

        // this.scope.addVariable();
        this.scope.addFormula('x', '1');
        this.scope.addFormula('y', 'x + 10');
    }

    ngOnInit() {
        this.initDialog = false;
        this.loading = true;
        this.expression = this.data.expression;
        this.test = this.data.test;
        this.block = this.data.block;
        this.properties = this.block.properties;
        this.schemas = this.data.schemas;
        this.schema = this.schemas?.find((v) => v.value === this.properties?.schema)?.data;

        this.schema = this.schemas[1].data;

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

    public onSave(): void {
        this.dialogRef.close({
            type: 'save',
            expression: this.expression
        });
    }

    public onTest(): void {
        this.dialogRef.close({
            type: 'test',
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

    public deleteVariable(variable: Link) {
        this.scope.deleteVariable(variable);
    }

    public addFormula() {
        this.scope.addFormula();
    }

    public addVariable() {
        this.scope.addVariable();
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
        }
    }

    public onLink(item: Link) {
        if (!this.schema) {
            return;
        }
        const dialogRef = this.dialogService.open(FieldLinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                link: item.field,
                schema: this.schema,
            },
        });
        dialogRef.onClose.subscribe((result: string | null) => {
            if (result) {
                item.field = result;
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

    public deleteLink(item: Link, $event: any) {
        $event.preventDefault();
        $event.stopPropagation();
        item.field = null;
    }

    public onStep(step: string) {
        this.step = step;
    }

    public getHeader(step: string) {
        switch (step) {
            case 'formulas':
                return 'Formulas & Variables';
            case 'code':
                return 'Code';
            case 'set':
                return 'Set';
            case 'data':
                return 'Input Data';
            case 'formulas_results':
                return 'Formulas & Variables';
            case 'code_results':
                return 'Code';
            case 'set_results':
                return 'Set';
            default:
                return null;
        }
    }

    public onChangeCode() {
    }

    public onValidate() {
        if (this.scope) {
            debugger

            this.scope.validate();

            debugger

            const context = this.scope.createContext();
            context?.setDocument({});

            debugger;
        }
    }
}
