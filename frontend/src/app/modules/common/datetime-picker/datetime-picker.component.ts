import {Component, EventEmitter, Input, Output} from '@angular/core';
import moment from 'moment';

/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'datetime-picker',
    templateUrl: './datetime-picker.component.html',
    styleUrls: ['./datetime-picker.component.css'],
})
export class DatetimePicker {
    @Input() placeholder!: string;
    @Input() readonly!: boolean;
    @Input() value!: Date;
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

    onValue(event: Date) {
        const utcValue = moment(event).utc().toISOString();
        if (this.value !== event) {
            this.valueChange.emit(utcValue);
        }
    }
}
