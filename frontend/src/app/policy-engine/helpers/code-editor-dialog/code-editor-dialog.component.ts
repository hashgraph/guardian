import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
/**
 * Export schema dialog.
 */
@Component({
    selector: 'code-editor-dialog',
    templateUrl: './code-editor-dialog.component.html',
    styleUrls: ['./code-editor-dialog.component.css']
})
export class CodeEditorDialogComponent {
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
    };

    expression!: string;

    constructor(
        public dialogRef: MatDialogRef<CodeEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    }

    ngOnInit() {
        this.expression = this.data.expression;
        console.log(this);
    }


    onSave(): void {
        this.dialogRef.close({
            expression: this.expression
        });
    }

}
