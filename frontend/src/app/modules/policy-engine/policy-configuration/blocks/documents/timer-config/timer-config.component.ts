import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation} from '@angular/core';
// import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import {CronConfigDialog} from '../../../../dialogs/cron-config-dialog/cron-config-dialog.component';
import {IModuleVariables, PolicyBlock} from '../../../../structures';
import {DialogService} from 'primeng/dynamicdialog';

/**
 * Settings for block of 'timer' type.
 */
@Component({
    selector: 'timer-config',
    templateUrl: './timer-config.component.html',
    styleUrls: ['./timer-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class TimerConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        options: false,
        expressionsGroup: false,
        expressions: {},
    };

    properties!: any;

    public periodOptions = [
        {label: 'Yearly', value: 'yearly'},
        {label: 'Monthly', value: 'monthly'},
        {label: 'Weekly', value: 'weekly'},
        {label: 'Daily', value: 'daily'},
        {label: 'Hourly', value: 'hourly'},
        {label: 'Custom', value: 'custom'}
    ];

    constructor(
        // private dialog: MatDialog
        private dialog: DialogService,
    ) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
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
                // disableClose: true,
                data: {
                    startDate: this.properties.startDate
                },
                // autoFocus: false
                modal: true,
                closable: false,
            });
            dialogRef.onClose.subscribe(async (result) => {
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
