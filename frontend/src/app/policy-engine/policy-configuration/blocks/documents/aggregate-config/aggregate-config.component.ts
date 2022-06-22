import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';
import { MatDialog } from '@angular/material/dialog';
import { CronConfigDialog } from '../../../../helpers/cron-config-dialog/cron-config-dialog.component';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/policy-model';

/**
 * Settings for block of 'aggregateDocument' type.
 */
@Component({
    selector: 'aggregate-config',
    templateUrl: './aggregate-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './aggregate-config.component.css'
    ]
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
    allTimer!: BlockNode[];

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
