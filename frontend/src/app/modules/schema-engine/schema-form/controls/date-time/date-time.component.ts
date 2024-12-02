import { AfterViewInit, Component, Input, NgZone, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import * as moment from 'moment';

@Component({
    selector: 'date-time',
    templateUrl: './date-time.component.html',
    styleUrls: ['./date-time.component.scss'],
})
export class DateTimeComponent implements OnInit, AfterViewInit{
    @Input('control') control: UntypedFormControl;
    @Input('showIcon') showIcon: boolean = true;
    @Input('showSeconds') showSeconds: boolean = true;
    @Input('showTime') showTime: boolean = true;
    @Input('dateFormat') dateFormat: string = 'yy-mm-dd';

    @ViewChild('calendar') calendar: any

    constructor(
        private ngZone: NgZone,
    ) {
    }

    ngOnInit() {
    }

    ngAfterViewInit() {
        const value = this.calendar.value;
        if (value) {
            this.ngZone.runOutsideAngular(() => {
                this.calendar.el.nativeElement.querySelector('input').value = moment(value).format('YYYY-MM-DD HH:mm:ss');
            });
        }
    }
}
