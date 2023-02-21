import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CodeEditorDialogComponent } from '../../../../helpers/code-editor-dialog/code-editor-dialog.component';
import { Schema, Token, SchemaField } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel, SchemaVariables } from 'src/app/policy-engine/structures';

@Component({
    selector: 'app-custom-logic-config',
    templateUrl: './custom-logic-config.component.html',
    styleUrls: ['./custom-logic-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class CustomLogicConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    block!: any;
    propHidden: any = {
        outputSchemaGroup: false
    };
    schemas!: SchemaVariables[];

    constructor(
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.schemas = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {}
        this.block.expression = this.block.expression || ''
        this.block.documentSigner = this.block.documentSigner || '';
        this.block.idType = this.block.idType || '';
        this.schemas = this.moduleVariables?.schemas || [];
    }

    editExpression($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            width: '80%',
            panelClass: 'g-dialog',
            data: {
                expression: this.block.expression,
                readonly: this.readonly
            },
            autoFocus: true,
            disableClose: true
        })
        dialogRef.afterClosed().subscribe(result => {
            this.block.expression = result.expression;
        })
    }

    onSelectOutput() {
        this.block.inputFields = [];
        const schema = this.schemas.find(e => e.value == this.block.outputSchema);
        if (schema && schema.data) {
            for (const field of schema.data.fields) {
                this.block.inputFields.push({
                    name: field.name,
                    title: field.description,
                    value: field.name
                })
            }
        }
    }
}
