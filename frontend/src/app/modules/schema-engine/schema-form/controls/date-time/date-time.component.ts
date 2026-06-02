import { AfterViewInit, Component, Input, NgZone, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import moment from 'moment';
import { Subject, Subscription } from 'rxjs';

type InputType = 'default' | 'test' | 'suggest';

@Component({
    selector: 'date-time-control',
    templateUrl: './date-time.component.html',
    styleUrls: ['./date-time.component.scss'],
})
export class DateTimeComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    @Input('control') control: UntypedFormControl;
    @Input('showIcon') showIcon: boolean = true;
    @Input('showSeconds') showSeconds: boolean = true;
    @Input('showTime') showTime: boolean;
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
        // if (this.item.subject) {
        this.subscription.add(
            this.control.valueChanges.subscribe(() => {
                this.fillField();
            })
        );
        // }
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngAfterViewInit() {
        (this.calendar?.el.nativeElement.querySelector('input') as HTMLInputElement).readOnly = true;
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
                    const date = moment(value, 'hh:mm:ss');
                    this.control.setValue(date.format('HH:mm:ss'), {
                        emitEvent: false,
                        emitModelToViewChange: false
                    });
                    this.calendar.value = date.toDate()
                    input.value = moment(value, 'hh:mm:ss').format('HH:mm:ss');
                } else if (!this.showTime) {
                    const date = moment(value, 'YYYY-MM-DD');
                    this.control.setValue(date.format('YYYY-MM-DD'), {
                        emitEvent: false,
                        emitModelToViewChange: false
                    });
                    this.calendar.value = date.toDate()
                    input.value = moment(value, 'YYYY-MM-DD').format('YYYY-MM-DD');
                } else {
                    const date = moment(value);
                    this.control.setValue(date.toISOString(), {
                        emitEvent: false,
                        emitModelToViewChange: false
                    })
                    this.calendar.value = date.toDate()
                    input.value = moment(value).toISOString();
                }
            }
        }, 100)
    }
}
