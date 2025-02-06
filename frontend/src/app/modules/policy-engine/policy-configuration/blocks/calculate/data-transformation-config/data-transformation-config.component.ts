import {Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation} from '@angular/core';
import {CodeEditorDialogComponent} from '../../../../dialogs/code-editor-dialog/code-editor-dialog.component';
import {PolicyBlock, SchemaVariables} from '../../../../structures';
import {DialogService} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-data-transformation-config',
    templateUrl: './data-transformation-config.component.html',
    styleUrls: ['./data-transformation-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class DataTransformationConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private item!: PolicyBlock;

    properties!: any;
    propHidden: any = {
        outputSchemaGroup: false
    };
    schemas!: SchemaVariables[];

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
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {}
        this.properties.expression = this.properties.expression || ''
        this.properties.documentSigner = this.properties.documentSigner || '';
        this.properties.idType = this.properties.idType || '';
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
