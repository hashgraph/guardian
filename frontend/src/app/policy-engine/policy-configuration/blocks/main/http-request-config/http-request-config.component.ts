import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { CodeEditorDialogComponent } from '../../../../helpers/code-editor-dialog/code-editor-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

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
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
    };

    block!: any;

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
        this.block = block.properties;
        this.block.headers = this.block.headers || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addHeader() {
        this.block.headers.push({
            tag: `Condition_${this.block.headers.length}`,
            type: 'equal',
            value: '',
            actor: '',
        })
    }

    onRemoveHeader(i: number) {
        this.block.headers.splice(i, 1);
    }

    editBody($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            width: '80%',
            panelClass: 'g-dialog',
            data: {
                mode: 'json',
                expression: this.block.messageBody,
                readonly: this.readonly
            },
            autoFocus: true,
            disableClose: true
        })
        dialogRef.afterClosed().subscribe(result => {
            this.block.messageBody = result.expression;
        })
    }
}
