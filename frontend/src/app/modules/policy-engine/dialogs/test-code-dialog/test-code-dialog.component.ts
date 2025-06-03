import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyFolder, PolicyItem, SchemaVariables } from '../../structures';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

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
    public dataType: string;
    public schemaId: string;
    public schema: any;
    public jsonValue: string;
    public schemas!: SchemaVariables[];
    public policyId: string;
    public schemaValue: UntypedFormGroup;
    public fileExtension = 'json';
    public fileLabel = 'Add json .json file';
    public fileValue: any;
    public historyValue: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
        private dialogService: DialogService,
        private policyEngineService: PolicyEngineService,
    ) {
        this.initDialog = false;
        this.title = this.config.header || '';
        this.block = this.config.data?.block;
        this.folder = this.config.data?.folder;
        this.readonly = this.config.data?.readonly;
        this.policyId = this.config.data?.policyId;
        this.step = 'prop';
        this.resultStep = 'output';
        this.dataType = 'schema';
        this.expression = this.block?.properties?.expression || '';
        this.codeMirrorOptions.readOnly = !!this.readonly;
        this.jsonValue = '';
        this.schemas = this.block?.moduleVariables?.schemas || [];
        this.schemaValue = this.fb.group({});
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

    public onChangeSchema() {
        this.schema = this.schemas?.find((s) => s.value === this.schemaId)?.data;
    }

    public onTest(): void {
        this.loading = true;
        const input = this.getValue();
        const block = this.block.getJSON();
        const data = {
            type: 'json',
            input: 'RunEvent',
            output: 'RunEvent',
            document: input
        }
        this.policyEngineService
            .runBlock(this.policyId, {
                block,
                data
            })
            .subscribe((result) => {
                this.loading = true;
                this.result = {
                    input: result.input ? JSON.stringify(result.input, null, 4) : '',
                    logs: result.logs?.join('\r\n') || '',
                    output: result.output ? JSON.stringify(result.output, null, 4) : '',
                    errors: result.errors?.join('\r\n') || '',
                };
                this.step = 'result';
                if (result.errors?.length) {
                    this.resultStep = 'errors';
                } else {
                    this.resultStep = 'output';
                }
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
                this.result = {
                    input: '',
                    logs: [],
                    output: '',
                    errors: [String(e.error)]
                };
            });
    }

    public onStep(step: string) {
        this.step = step;
        if (this.step === 'result' || this.step === 'code') {
            this.loading = true;
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        } else {
            this.loading = false;
        }
    }

    public onResultStep(step: string) {
        this.resultStep = step;
    }

    public importFromFile(event: any) {
        const reader = new FileReader()
        reader.readAsText(event);
        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;
            this.fileValue = JSON.parse(arrayBuffer);
        });
    }

    private getValue() {
        switch (this.dataType) {
            case 'schema':
                return this.schemaValue.value;
            case 'json':
                return this.jsonValue;
            case 'file':
                return this.fileValue;
            case 'history':
                return this.historyValue;
            default:
                return null;
        }
    }

    onChangeCode() {
        if (this.block && this.block.properties) {
            this.block.properties.expression = this.expression;
        }
    }

    getHeader() {
        switch (this.step) {
            case 'prop':
                return 'Properties';
            case 'data':
                return 'Input Data';
            case 'code':
                return 'Code';
            case 'result':
                return 'Result';
            default:
                return null;
        }
    }
}
