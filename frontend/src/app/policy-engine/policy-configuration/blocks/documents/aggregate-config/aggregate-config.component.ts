import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';
import { MatDialog } from '@angular/material/dialog';
import { CronConfigDialog } from '../../../../helpers/cron-config-dialog/cron-config-dialog.component';

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
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Input('topics') topics!: any[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        options:false,
        expressionsGroup: false,
        expressions: {},
    };

    block!: BlockNode;
    allTimer!: BlockNode[];

    constructor(private dialog: MatDialog) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.target);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.target);
    }

    load(block: BlockNode) {
        this.allTimer = this.all?.filter(e=>e.blockType=='timerBlock');
        this.block = block;
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
