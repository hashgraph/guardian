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
    @Input() value!: string;
    @Input() format!: any;
    @Input() appendTo: string | null = null;
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
    public currentDate: Date

    constructor() {
    }

    ngOnInit() {
        this.placeholder = this.placeholder || 'Choose a date & time';
        if (this.value) {
            this.currentDate = new Date(this.value);
        }
    }

    onValue(event: Date) {
        const utcValue = moment(event).utc().toISOString();

        if (this.value !== utcValue) {
            this.valueChange.emit(utcValue);
        }
    }
}
