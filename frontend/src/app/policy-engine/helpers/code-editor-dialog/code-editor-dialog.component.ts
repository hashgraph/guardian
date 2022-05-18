import {
    AfterContentChecked, AfterContentInit,
    AfterViewChecked,
    AfterViewInit,
    Component,
    Inject,
    OnInit,
    ViewChild
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
/**
 * Export schema dialog.
 */
@Component({
    selector: 'code-editor-dialog',
    templateUrl: './code-editor-dialog.component.html',
    styleUrls: ['./code-editor-dialog.component.css']
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

    constructor(
        public dialogRef: MatDialogRef<CodeEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    }

    ngOnInit() {
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

}
