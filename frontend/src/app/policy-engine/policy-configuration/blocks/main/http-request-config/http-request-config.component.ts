import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { CodeEditorDialogComponent } from '../../../../helpers/code-editor-dialog/code-editor-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'switch' and 'interfaceStepBlock' types.
 */
@Component({
    selector: 'http-request-config',
    templateUrl: './http-request-config.component.html',
    styleUrls: ['./http-request-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class HttpRequestConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
    };

    properties!: any;

    constructor(
        private dialog: MatDialog
    ) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.headers = this.properties.headers || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addHeader() {
        this.properties.headers.push({
            tag: `Condition_${this.properties.headers.length}`,
            type: 'equal',
            value: '',
            actor: '',
        })
    }

    onRemoveHeader(i: number) {
        this.properties.headers.splice(i, 1);
    }

    editBody($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            width: '80%',
            panelClass: 'g-dialog',
            data: {
                mode: 'json',
                expression: this.properties.messageBody,
                readonly: this.readonly
            },
            autoFocus: true,
            disableClose: true
        })
        dialogRef.afterClosed().subscribe(result => {
            this.properties.messageBody = result.expression;
        })
    }
    
    onSave() {
        this.item.changed = true;
    }
}
