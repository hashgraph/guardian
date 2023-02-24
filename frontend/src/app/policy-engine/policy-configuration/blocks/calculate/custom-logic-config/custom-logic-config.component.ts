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
    private item!: PolicyBlockModel;
    
    properties!: any;
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
            this.properties.expression = result.expression;
        })
    }

    onSelectOutput() {
        this.properties.inputFields = [];
        const schema = this.schemas.find(e => e.value == this.properties.outputSchema);
        if (schema && schema.data) {
            for (const field of schema.data.fields) {
                this.properties.inputFields.push({
                    name: field.name,
                    title: field.description,
                    value: field.name
                })
            }
        }
    }
    
    onSave() {
        this.item.changed = true;
    }
}
