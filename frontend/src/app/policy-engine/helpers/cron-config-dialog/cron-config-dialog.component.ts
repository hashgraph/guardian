import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import * as moment from 'moment';
import cronstrue from 'cronstrue';

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
    timeString!: string;
    sd_local: moment.Moment;

    constructor(
        public dialogRef: MatDialogRef<CronConfigDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.period = 'week';
        this.startDate = data.startDate || (new Date).toISOString();
        this.sd = moment(this.startDate).utc();
        this.sd_local = this.sd.clone().local();
        switch (this.sd.day()) {
            case 0: this.weekDay.Su = true; break;
            case 1: this.weekDay.Mo = true; break;
            case 2: this.weekDay.Tu = true; break;
            case 3: this.weekDay.We = true; break;
            case 4: this.weekDay.Th = true; break;
            case 5: this.weekDay.Fr = true; break;
            case 6: this.weekDay.Sa = true; break;
        }
        this.onWeekChange();
    }

    ngOnInit() {
        setTimeout(() => {
            this.started = true;
        }, 200);
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

    getMask() {
        switch (this.period) {
            case "month": {
                return `${this.sd.minute()} ${this.sd.hour()} ${this.sd.date()} ${this.getMonthMap()} *`;
            }
            case "week": {
                return `${this.sd.minute()} ${this.sd.hour()} * * ${this.getWeekMap()}`;
            }
            case "year": {
                return `${this.sd.minute()} ${this.sd.hour()} ${this.sd.date()} ${this.sd.month() + 1} *`;
            }
            case "day": {
                return `${this.sd.minute()} ${this.sd.hour()} * * *`;
            }
            case "hour": {
                return `${this.sd.minute()} * * * *`;
            }
            case "minute": {
                return `* * * * *`;
            }
            default:
                return `* * * * *`;
        }
    }

    getMaskByInterval() {
        const data = this.dataForm.value;
        switch (this.period) {
            case "month": {
                return `${this.sd_local.minute()} ${this.sd_local.hour()} ${this.sd_local.date()} ${this.getMonthMap()}/${data.interval} *`;
            }
            case "week": {
                return `${this.sd_local.minute()} ${this.sd_local.hour()} * * ${this.getWeekMap()}`;
            }
            case "year": {
                return `${this.sd_local.minute()} ${this.sd_local.hour()} ${this.sd_local.date()} ${this.sd_local.month() + 1} *`;
            }
            case "day": {
                return `${this.sd_local.minute()} ${this.sd_local.hour()} */${data.interval} * *`;
            }
            case "hour": {
                return `${this.sd_local.minute()} */${data.interval} * * *`;
            }
            case "minute": {
                return `*/${data.interval} * * * *`;
            }
            default:
                return `* * * * *`;
        }
    }

    selectPeriod() {
        this.setMask(this.getMask());
        this.setText(this.getMaskByInterval());
    }

    onWeekChange() {
        this.setMask(this.getMask());
        this.setText(this.getMaskByInterval());
    }

    onMonthChange() {
        this.setMask(this.getMask());
        this.setText(this.getMaskByInterval());
    }

    setMask(mask: string) {
        const data = this.dataForm.value;
        this.dataForm.setValue({ mask: mask, interval: data.interval });
    }

    setText(mask: string) {
        this.timeString = cronstrue.toString(mask, { use24HourTimeFormat: true });
    }
}
