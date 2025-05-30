import {AfterContentInit, Component, OnInit, ViewChild} from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import {CodemirrorComponent} from '@ctrl/ngx-codemirror';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'code-editor-dialog',
    templateUrl: './code-editor-dialog.component.html',
    styleUrls: ['./code-editor-dialog.component.scss']
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

    @ViewChild(CodemirrorComponent)
    codeEditorComponent!: CodemirrorComponent;

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
        }
        this.expression = this.data.expression;
        this.codeMirrorOptions.readOnly = this.data.readonly;
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
}
