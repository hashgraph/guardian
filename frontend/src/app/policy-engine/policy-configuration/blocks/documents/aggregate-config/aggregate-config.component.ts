import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { MatDialog } from '@angular/material/dialog';
import { PolicyModel } from 'src/app/policy-engine/structures/policy.model';
import { PolicyBlockModel } from "src/app/policy-engine/structures/policy-block.model";

/**
 * Settings for block of 'aggregateDocument' type.
 */
@Component({
    selector: 'aggregate-config',
    templateUrl: './aggregate-config.component.html',
    styleUrls: ['./aggregate-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class AggregateConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        options: false,
        expressionsGroup: false,
        expressions: {},
    };

    block!: any;
    allTimer!: PolicyBlockModel[];

    constructor(private dialog: MatDialog) {
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
        this.block.expressions = this.block.expressions || [];
        this.block.uiMetaData = this.block.uiMetaData || {}
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addExpression() {
        this.block.expressions.push({
            name: '',
            value: '',
        })
    }

    onRemoveExpression(i: number) {
        this.block.expressions.splice(i, 1);
    }
}
