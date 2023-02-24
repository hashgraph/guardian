import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { MatDialog } from '@angular/material/dialog';
import { CronConfigDialog } from '../../../../helpers/cron-config-dialog/cron-config-dialog.component';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'timer' type.
 */
@Component({
    selector: 'timer-config',
    templateUrl: './timer-config.component.html',
    styleUrls: ['./timer-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class TimerConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        main: false,
        options: false,
        expressionsGroup: false,
        expressions: {},
    };

    properties!: any;

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
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    selectPeriod() {
        if (this.properties.period == 'custom') {
            const dialogRef = this.dialog.open(CronConfigDialog, {
                width: '550px',
                disableClose: true,
                data: {
                    startDate: this.properties.startDate
                },
                autoFocus: false
            });
            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    this.properties.periodMask = result.mask;
                    this.properties.periodInterval = result.interval;
                } else {
                    this.properties.periodMask = '';
                    this.properties.periodInterval = '';
                }
            });
        } else {
            this.properties.periodMask = '';
            this.properties.periodInterval = '';
        }
    }
}
