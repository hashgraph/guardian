import { Component, EventEmitter, Inject, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as moment from 'moment';
import { NgxMatDateAdapter, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';

export const DATETIME_FORMATS = {
    parse: {
        dateInput: 'l, LT',
    },
    display: {
        dateInput: 'DD-MM-YYYY HH:mm (Z)',
        monthYearLabel: 'MM yyyy',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    }
};

/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'datetime-picker',
    templateUrl: './datetime-picker.component.html',
    styleUrls: ['./datetime-picker.component.css'],
    providers: [
        { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
        { provide: NGX_MAT_DATE_FORMATS, useValue: DATETIME_FORMATS }
    ]
})
export class DatetimePicker {
    @Input() placeholder!: string;
    @Input() readonly!: boolean;
    @Input() value!: string;
    @Input() format!: any;
    @Output() valueChange = new EventEmitter<string>();

    private _currentValue!: string;

    public disabled = false;
    public showSpinners = true;
    public showSeconds = false;
    public touchUi = false;
    public enableMeridian = true;
    public stepHour = 1;
    public stepMinute = 5;
    public stepSecond = 1;
    public defaultTime = [new Date().getHours(), 0, 0]

    constructor() {
    }

    ngOnInit() {
        this.placeholder = this.placeholder || 'Choose a date & time';
    }

    onValue(event: any) {
        this._currentValue = moment(event.value).utc().toISOString();
        if (this.value != this._currentValue) {
            this.value = this._currentValue;
            this.valueChange.emit(this._currentValue);
        }
    }
}