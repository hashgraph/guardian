import { AfterViewInit, Component, Input, NgZone, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import moment from 'moment';
import { Subject, Subscription } from 'rxjs';

@Component({
    selector: 'enum-control',
    templateUrl: './enum.html',
    styleUrls: ['./enum.scss'],
})
export class EnumComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy{
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

    @ViewChild('calendar') calendar: any

    private subscription = new Subscription();

    constructor(
        private ngZone: NgZone,
    ) {
    }

    ngOnInit() {
        if (this.item.subject) {
            this.item.subject.subscribe(() => {
                this.fillField();
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
        if (this.value) {
            value = this.value;
        } else if (this.timeOnly && comment?.suggest) {
            value = comment.suggest;
        } else if (this.calendar?.value) {
            value = this.calendar?.value;
        } else if (this.item.value) {
            value = this.item.value;
        }

        const input = this.calendar?.el.nativeElement.querySelector('input')

        setTimeout(() => {
            if (input && value) {
                if (this.timeOnly) {
                    const date = moment(value, 'hh-mm-ss').toDate();
                    this.control.setValue(date);
                    input.value = value;
                } else {
                    input.value = moment(value).format('YYYY-MM-DD HH:mm:ss');
                }
            }
        })
    }
}
