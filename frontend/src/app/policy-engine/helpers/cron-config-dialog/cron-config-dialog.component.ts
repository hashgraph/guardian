import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import * as moment from 'moment';

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'cron-config-dialog',
    templateUrl: './cron-config-dialog.component.html',
    styleUrls: ['./cron-config-dialog.component.css']
})
export class CronConfigDialog {
    started = false;
    period: string;
    startDate: string;

    dataForm = this.fb.group({
        mask: ['* * * * *', Validators.required],
        interval: [1, Validators.required],
    });

    weekDay = {
        Mo: false,
        Tu: false,
        We: false,
        Th: false,
        Fr: false,
        Sa: false,
        Su: false,
    }
    month = {
        January: false,
        February: false,
        March: false,
        April: false,
        May: false,
        June: false,
        July: false,
        August: false,
        September: false,
        October: false,
        November: false,
        December: false
    }
    sd: moment.Moment;

    constructor(
        public dialogRef: MatDialogRef<CronConfigDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.period = 'week';
        this.startDate = data.startDate;
        this.sd = moment(this.startDate);
        this.onWeekChange();
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.dialogRef.close(data);
        }
    }

    selectPeriod() {
        const data = this.dataForm.value;
        switch (this.period) {
            case "month": {
                this.onMonthChange();
                break;
            }
            case "week": {
                this.onWeekChange();
                break;
            }
            case "year": {
                this.dataForm.setValue({
                    mask: `${this.sd.minute()} ${this.sd.hour()} ${this.sd.date()} ${this.sd.month() + 1} *`,
                    interval: data.interval
                })
                break;
            }
            case "day": {
                this.dataForm.setValue({
                    mask: `${this.sd.minute()} ${this.sd.hour()} * * *`,
                    interval: data.interval
                })
                break;
            }
            case "hour": {
                this.dataForm.setValue({
                    mask: `${this.sd.minute()} * * * *`,
                    interval: data.interval
                })
                break;
            }
            case "minute": {
                this.dataForm.setValue({
                    mask: `* * * * *`,
                    interval: data.interval
                })
                break;
            }
        }
    }

    getWeekMap() {
        const l = [];
        if (this.weekDay.Mo) l.push(1);
        if (this.weekDay.Tu) l.push(2);
        if (this.weekDay.We) l.push(3);
        if (this.weekDay.Th) l.push(4);
        if (this.weekDay.Fr) l.push(5);
        if (this.weekDay.Sa) l.push(6);
        if (this.weekDay.Su) l.push(0);
        if (l.length == 7) return '*';
        if (l.length == 0) return '*';
        return l.join(',');
    }

    getMonthMap() {
        const l = [];
        if (this.month.January) l.push(1);
        if (this.month.February) l.push(2);
        if (this.month.March) l.push(3);
        if (this.month.April) l.push(4);
        if (this.month.May) l.push(5);
        if (this.month.June) l.push(6);
        if (this.month.July) l.push(7);
        if (this.month.August) l.push(8);
        if (this.month.September) l.push(9);
        if (this.month.October) l.push(10);
        if (this.month.November) l.push(11);
        if (this.month.December) l.push(12);
        if (l.length == 12) return '*';
        if (l.length == 0) return '*';
        return l.join(',');
    }

    onWeekChange() {
        const data = this.dataForm.value;
        this.dataForm.setValue({
            mask: `${this.sd.minute()} ${this.sd.hour()} * * ${this.getWeekMap()}`,
            interval: data.interval
        })
    }

    onMonthChange() {
        const data = this.dataForm.value;
        this.dataForm.setValue({
            mask: `${this.sd.minute()} ${this.sd.hour()} ${this.sd.date()} ${this.getMonthMap()} *`,
            interval: data.interval
        })
    }
}
