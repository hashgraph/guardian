import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';
import { MatDialog } from '@angular/material/dialog';
import { CodeEditorDialogComponent } from '../../../../helpers/code-editor-dialog/code-editor-dialog.component';
import { Schema, Token, SchemaField } from '@guardian/interfaces';

@Component({
  selector: 'app-custom-logic-config',
  templateUrl: './custom-logic-config.component.html',
  styleUrls: [
      './../../../common-properties/common-properties.component.css',
      './custom-logic-config.component.css'
  ]
})
export class CustomLogicConfigComponent implements OnInit {

    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Input('topics') topics!: any[];
    @Output() onInit = new EventEmitter();

    block!: BlockNode;

    propHidden: any = {
        outputSchemaGroup: false
    };

    constructor(
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.target);
    }

    load(block: BlockNode) {
        this.block = block;
        this.block.uiMetaData = this.block.uiMetaData || {}
        this.block.expression = this.block.expression || ''
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
        const schema = this.schemes.find(e => e.iri == this.block.outputSchema)
        if (schema) {
            for (let i = 0; i < schema.fields.length; i++) {
                const field = schema.fields[i];
                this.block.inputFields.push({
                    name: field.name,
                    title: field.description,
                    value: field.name
                })
            }
        }
    }
}
