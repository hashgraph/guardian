import {Component, EventEmitter, Inject, Input, OnInit, Output, ViewEncapsulation} from '@angular/core';
import {CodeEditorDialogComponent} from '../../../../dialogs/code-editor-dialog/code-editor-dialog.component';
import {IModuleVariables, PolicyBlock, SchemaVariables} from '../../../../structures';
import {DialogService} from 'primeng/dynamicdialog';

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
        {label: 'Policy Owner', value: ''},
        {label: 'First Document Owner', value: 'owner'},
        {label: 'First Document Issuer', value: 'issuer'}
    ];

    public idTypeOptions = [
        {label: 'None', value: ''},
        {label: 'DID (New DID)', value: 'DID'},
        {label: 'UUID (New UUID)', value: 'UUID'},
        {label: 'Owner (Owner DID)', value: 'OWNER'},
        {label: 'From First Document Id', value: 'DOCUMENT'}
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
        this.schemas = this.moduleVariables?.schemas || [];
    }

    editExpression($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            width: '80%',
            data: {
                expression: this.properties.expression,
                readonly: this.readonly
            },
            styleClass: 'g-dialog',
            modal: true,
            closable: false,
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.properties.expression = result.expression;
            }
        })
    }

    onSave() {
        this.item.changed = true;
    }
}
