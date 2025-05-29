import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyFolder, PolicyItem } from '../../structures';

@Component({
    selector: 'test-code-dialog',
    templateUrl: './test-code-dialog.component.html',
    styleUrls: [
        './test-code-dialog.component.scss',
        '../../styles/properties.scss'
    ],
})
export class TestCodeDialog {
    public initDialog = false;
    public loading = true;
    public title: string;
    public block: PolicyItem;
    public folder: PolicyFolder;
    public readonly: boolean;
    public step: string;
    public resultStep: string;
    public expression: string;
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
    public result: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.initDialog = false;
        this.title = this.config.header || '';
        this.block = this.config.data?.block;
        this.folder = this.config.data?.folder;
        this.readonly = this.config.data?.readonly;
        this.step = 'prop';
        this.resultStep = 'output';
        this.expression = this.block?.properties?.expression || '';
        this.codeMirrorOptions.readOnly = !!this.readonly;
    }

    ngOnInit() {
        this.initDialog = false;
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
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onTest(): void {
        this.result = {
            input: JSON.stringify({ a: 1, b: 2 }, null, 4),
            logs: 'Test',
            output: JSON.stringify({ a: 10, b: 20 }, null, 4)
        };
        this.step = 'result';
        this.loading = true;
        setTimeout(() => {
            this.loading = false;
        }, 1000);
    }

    public onStep(step: string) {
        this.step = step;
        if (this.step === 'result' || this.step === 'code') {
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }
    }

    public onResultStep(step: string) {
        this.resultStep = step;
    }
}
