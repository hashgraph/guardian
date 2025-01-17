import { Component, EventEmitter, Inject, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { CodeEditorDialogComponent } from '../../../../dialogs/code-editor-dialog/code-editor-dialog.component';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';

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

    constructor(
        private dialog: MatDialog
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
            panelClass: 'g-dialog',
            data: {
                expression: this.properties.expression,
                readonly: this.readonly
            },
            autoFocus: true,
            disableClose: true
        })
        dialogRef.afterClosed().subscribe(result => {
            if(result) {
                this.properties.expression = result.expression;
            }
        })
    }

    onSave() {
        this.item.changed = true;
    }
}
