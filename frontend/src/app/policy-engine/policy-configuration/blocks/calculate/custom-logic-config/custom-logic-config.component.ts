import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';
import { MatDialog } from '@angular/material/dialog';
import { CodeEditorDialogComponent } from '../../../../helpers/code-editor-dialog/code-editor-dialog.component';
import { Schema, Token, SchemaField } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures/policy-model';

@Component({
    selector: 'app-custom-logic-config',
    templateUrl: './custom-logic-config.component.html',
    styleUrls: ['./custom-logic-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class CustomLogicConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    block!: any;

    propHidden: any = {
        outputSchemaGroup: false
    };

    constructor(
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {}
        this.block.expression = this.block.expression || ''
        this.block.documentSigner = this.block.documentSigner || '';
        this.block.idType = this.block.idType || '';
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
}
