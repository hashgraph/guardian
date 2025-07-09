import { Component, EventEmitter, Inject, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { CodeEditorDialogComponent } from '../../../../dialogs/code-editor-dialog/code-editor-dialog.component';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';
import { DialogService } from 'primeng/dynamicdialog';
import { TestCodeDialog } from 'src/app/modules/policy-engine/dialogs/test-code-dialog/test-code-dialog.component';
import { ScriptLanguageOption } from '@guardian/interfaces';

@Component({
    selector: 'app-custom-logic-config',
    templateUrl: './custom-logic-config.component.html',
    styleUrls: ['./custom-logic-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class CustomLogicConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    properties!: any;
    propHidden: any = {
        outputSchemaGroup: false
    };
    schemas!: SchemaVariables[];

    public documentSignerOptions = [
        { label: 'Policy Owner', value: '' },
        { label: 'First Document Owner', value: 'owner' },
        { label: 'First Document Issuer', value: 'issuer' }
    ];

    public idTypeOptions = [
        { label: 'None', value: '' },
        { label: 'DID (New DID)', value: 'DID' },
        { label: 'UUID (New UUID)', value: 'UUID' },
        { label: 'Owner (Owner DID)', value: 'OWNER' },
        { label: 'From First Document Id', value: 'DOCUMENT' }
    ];

    public scriptLanguagesOptions = [
        {label: 'JavaScript', value: ScriptLanguageOption.JAVASCRIPT},
        {label: 'Python', value: ScriptLanguageOption.PYTHON},
    ];

    constructor(
        private dialog: DialogService,
    ) {

    }

    ngOnInit(): void {
        this.schemas = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {}
        this.properties.expression = this.properties.expression || ''
        this.properties.documentSigner = this.properties.documentSigner || '';
        this.properties.idType = this.properties.idType || '';
        this.properties.selectedScriptLanguage = this.properties.selectedScriptLanguage || ScriptLanguageOption.JAVASCRIPT;
        this.schemas = this.moduleVariables?.schemas || [];
    }

    editExpression($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            showHeader: false,
            width: '80%',
            styleClass: 'guardian-dialog',
            data: {
                test: true,
                expression: this.properties.expression,
                readonly: this.readonly
            }
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.properties.expression = result.expression;
                if (result.type === 'test') {
                    this.onTest();
                }
            }
        })
    }

    onSave() {
        this.item.changed = true;
    }

    onTest(): void {
        const dialogRef = this.dialog.open(TestCodeDialog, {
            showHeader: false,
            header: 'Code',
            width: '1200px',
            styleClass: 'guardian-dialog',
            data: {
                block: this.item,
                folder: this.moduleVariables,
                readonly: this.readonly,
                policyId: this.item?.rootParent?.policyId
            }
        });
        dialogRef.onClose.subscribe(async (result) => {});
    }
}
