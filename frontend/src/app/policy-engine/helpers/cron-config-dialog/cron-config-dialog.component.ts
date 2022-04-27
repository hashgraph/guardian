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
    sd: moment.Moment;

    constructor(
        public dialogRef: MatDialogRef<CronConfigDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.period = 'week';
        this.startDate = data.startDate;
        this.sd = moment(this.startDate);
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
        
    }

    getWeekMap() {
        const l = [];
        if(this.weekDay.Mo) l.push(1);
        if(this.weekDay.Tu) l.push(2);
        if(this.weekDay.We) l.push(3);
        if(this.weekDay.Th) l.push(4);
        if(this.weekDay.Fr) l.push(5);
        if(this.weekDay.Sa) l.push(6);
        if(this.weekDay.Su) l.push(0);
        if(l.length == 7) return '*';
        if(l.length == 0) return '*';
        return l.join(',');
    }

    onWeekChange() {
        this.dataForm.setValue({
            mask: `${this.sd.minute()} ${this.sd.hour()} * * ${this.getWeekMap()}`
        })
    }
}
