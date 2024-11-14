import {AfterContentInit, Component, Inject, OnInit} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'code-editor-dialog',
    templateUrl: './code-editor-dialog.component.html',
    styleUrls: ['./code-editor-dialog.component.scss']
})
export class CodeEditorDialogComponent implements OnInit, AfterContentInit {
    codeMirrorOptions: any = {
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

    expression!: string;

    initDialog = false;

    data: any

    constructor(
        // public dialogRef: MatDialogRef<CodeEditorDialogComponent>,
        // @Inject(MAT_DIALOG_DATA) public data: any
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        this.data = this.config.data
    }

    ngOnInit() {
        if (this.data.mode) {
            this.codeMirrorOptions.mode = this.data.mode;
        }
        this.expression = this.data.expression;
        this.codeMirrorOptions.readOnly = this.data.readonly;
    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;
        }, 100);

    }

    onSave(): void {
        this.dialogRef.close({
            expression: this.expression
        });
    }

    onClose(): void {
        this.dialogRef.close(null);
    }
}
