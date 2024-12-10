import { AfterViewInit, Component, Input, NgZone, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import * as moment from 'moment';
import { Subject, Subscription } from 'rxjs';

type InputType = 'default' | 'test' | 'suggest';

@Component({
    selector: 'date-time-control',
    templateUrl: './date-time.component.html',
    styleUrls: ['./date-time.component.scss'],
})
export class DateTimeComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy{
    @Input('control') control: UntypedFormControl;
    @Input('showIcon') showIcon: boolean = true;
    @Input('showSeconds') showSeconds: boolean = true;
    @Input('showTime') showTime: boolean = true;
    @Input('timeOnly') timeOnly: boolean = false;
    @Input('dateFormat') dateFormat: string = 'yy-mm-dd';
    @Input('item') item: any;
    @Input('isMany') isMany: boolean = false;
    @Input('index') isDisabled?: number;
    @Input('update') update?: Subject<any>;
    @Input('value') value?: string;
    @Input('type') type?: InputType;

    @ViewChild('calendar') calendar: any

    private subscription = new Subscription();

    constructor(
        private ngZone: NgZone,
    ) {
    }

    ngOnInit() {
        if (this.item.subject) {
            this.item.subject.subscribe(() => {
                // this.fillField();
            })
        }
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngAfterViewInit() {
        // if (this.isMany) {
            this.fillField();
        // }
    }

    ngOnChanges() {
        this.fillField();
    }

    fillField() {
        const comment = this.item?.field?.comment && JSON.parse(this.item.field.comment);
        let value: any = null;
        if (this.timeOnly && this.type && comment && comment[this.type]) {
            value = comment[this.type];
        } else if (this.calendar?.value) {
            value = this.calendar?.value;
        } else if (this.item.value) {
            value = this.item.value;
        } else if (this.item.preset) {
            value = this.item.preset;
        }

        setTimeout(() => {
            const input = this.calendar?.el.nativeElement.querySelector('input');
            if (input && value) {
                if (this.timeOnly) {
                    if (/^(\d+)-(\d+)-(\d+)$/.test(value)) {

                    }
                    const date = moment(value, 'hh:mm:ss').toDate();
                    this.control.setValue(date);
                    input.value = moment(value, 'hh:mm:ss').format('HH:mm:ss');
                } else {
                    this.control.setValue(moment(value).toDate())
                    input.value = moment(value).format('YYYY-MM-DD HH:mm:ss');
                }
            }
        }, 100)
    }
}
