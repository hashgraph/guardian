import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-json-editor-dialog',
    templateUrl: './json-editor-dialog.component.html',
    styleUrls: ['./json-editor-dialog.component.scss'],
})
export class JsonEditorDialogComponent implements OnInit {
    result: any;
    readOnly: boolean = false;

    codeMirrorOptions: any = {
        theme: 'default',
        mode: 'application/ld+json',
        styleActiveLine: true,
        lineNumbers: true,
        gutters: ['CodeMirror-linenumbers'],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readOnly: false,
        viewportMargin: Infinity,
    };

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig
    ) {}

    ngOnInit(): void {
        this.readOnly = !!this.dialogConfig.data.readOnly;
        if (this.readOnly) {
            this.codeMirrorOptions.readOnly = true;
        }
    }

    ngAfterViewInit() {
        setTimeout(() => {
            (
                document.getElementsByClassName('CodeMirror-gutters')[0] as any
            ).style.left = '0px';
            this.result = this.dialogConfig.data.data || '';
        }, 100);
    }
}
