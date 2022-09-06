import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';
import { MatDialog } from '@angular/material/dialog';
import { CronConfigDialog } from '../../../../helpers/cron-config-dialog/cron-config-dialog.component';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures/policy-model';

/**
 * Settings for block of 'timer' type.
 */
@Component({
    selector: 'timer-config',
    templateUrl: './timer-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './timer-config.component.css'
    ]
})
export class TimerConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        options:false,
        expressionsGroup: false,
        expressions: {},
    };

    block!: any;

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
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    selectPeriod() {
        if (this.block.period == 'custom') {
            const dialogRef = this.dialog.open(CronConfigDialog, {
                width: '550px',
                disableClose: true,
                data: {
                    startDate: this.block.startDate
                },
                autoFocus: false
            });
            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    this.block.periodMask = result.mask;
                    this.block.periodInterval = result.interval;
                } else {
                    this.block.periodMask = '';
                    this.block.periodInterval = '';
                }
            });
        } else {
            this.block.periodMask = '';
            this.block.periodInterval = '';
        }
    }
}
