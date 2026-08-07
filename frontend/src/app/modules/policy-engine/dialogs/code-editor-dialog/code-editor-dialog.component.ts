import { AfterContentInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CodemirrorComponent } from '@ctrl/ngx-codemirror';
import { EditorHelpContext } from './editor-help-context';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'code-editor-dialog',
    templateUrl: './code-editor-dialog.component.html',
    styleUrls: ['./code-editor-dialog.component.scss'],
    standalone: false
})
export class CodeEditorDialogComponent implements OnInit, AfterContentInit {
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
    public expression!: string;
    public initDialog = false;
    public loading = true;
    public data: any
    public test: boolean

    public helpContext: EditorHelpContext | null = null;
    public helpPanelOpen = false;
    public validationErrors: string[] = [];
    public shouldValidate = false;
    public expandedCategories: { [key: string]: boolean } = {};

    @ViewChild(CodemirrorComponent)
    codeEditorComponent!: CodemirrorComponent;

    public isLargeSize: boolean = true;
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        this.data = this.config.data
    }

    ngOnInit() {
        this.initDialog = false;
        this.loading = true;
        if (this.data.mode) {
            this.codeMirrorOptions.mode = this.data.mode;
            if (this.data.mode === 'formula-lang') {
                this.codeMirrorOptions.lint = false;
            }
        }
        if (this.data.placeholder) {
            this.codeMirrorOptions.placeholder = this.data.placeholder;
        }
        if (this.data.variables) {
            this.codeMirrorOptions.variables = this.data.variables;
        }
        this.expression = this.data.expression;
        this.codeMirrorOptions.readOnly = this.data.readonly;
        this.test = this.data.test;
        this.helpContext = this.data.helpContext || null;
        this.shouldValidate = !!this.data.validate;
    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, 100);
    }

    public toggleHelpPanel(): void {
        this.helpPanelOpen = !this.helpPanelOpen;
    }

    public insertField(fieldName: string): void {
        const cm = this.codeEditorComponent?.codeMirror;
        if (cm) {
            const cursor = cm.getCursor();
            cm.replaceRange(fieldName, cursor);
            cm.focus();
        }
    }

    public validateExpression(): string[] {
        const errors: string[] = [];
        const expr = (this.expression || '').trim();

        if (!expr) {
            errors.push('Expression is empty.');
            return errors;
        }

        // Build a mock document with available fields as properties
        const mockDocument: any = {};
        if (this.helpContext?.availableFields) {
            for (const field of this.helpContext.availableFields) {
                mockDocument[field] = 0;
            }
        }

        // Build a mock table helper matching the backend's buildTableHelper()
        const mockTable: any = {
            normalize: () => ({ type: 'table', columnKeys: [], rows: [] }),
            keys: () => [],
            rows: () => [],
            cell: () => 0,
            col: () => [],
            num: (v: any) => Number(v) || 0,
        };

        // Compile and execute, exactly as the backend does
        try {
            const fn = new Function('table', `with (this) { return ${expr} }`);
            fn.apply(mockDocument, [mockTable]);
        } catch (error: any) {
            const message = error?.message || String(error);
            errors.push(message);
        }

        return errors;
    }

    public onSave(): void {
        if (this.shouldValidate) {
            this.validationErrors = this.validateExpression();
            if (this.validationErrors.length > 0) {
                return;
            }
        }
        this.dialogRef.close({
            type: 'save',
            expression: this.expression
        });
    }

    public forceSave(): void {
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

    focusEditor() {
        const cm = this.codeEditorComponent?.codeMirror;
        if (cm) {
            cm.focus();
            if (!cm.hasFocus()) {
                cm.setCursor({ line: 0, ch: 0 });
            }
        }
    }

    public toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
