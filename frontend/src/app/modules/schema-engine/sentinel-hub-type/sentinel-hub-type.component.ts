import { AfterViewInit, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MapService } from '../../../services/map.service';
import moment from 'moment';
import { SentinelHubForm } from '../schema-form-model/sentinel-hub-form';

@Component({
    selector: 'app-sentinel-hub-type',
    templateUrl: './sentinel-hub-type.component.html',
    styleUrls: ['./sentinel-hub-type.component.scss'],
})
export class SentinelHubTypeComponent implements OnInit, OnChanges, AfterViewInit {
    @ViewChild('dateFrom') dateFrom: any
    @ViewChild('dateTo') dateTo: any

    @Input('preset') presetDocument: any = null;
    @Input('form-model') formModel!: SentinelHubForm;
    @Input('disabled') isDisabled: boolean = false;

    public key: string;
    public subscription = new Subscription();

    public datePicker = new UntypedFormGroup({
        from: new UntypedFormControl(null, Validators.required),
        to: new UntypedFormControl(null, Validators.required)
    });
    protected readonly FormControl = UntypedFormControl;

    public get formattedImageLink(): string {
        if (!this.key || !this.formModel) {
            return '';
        }

        return this.formModel.formattedImageLink(this.key);
    }

    constructor(
        private cdkRef: ChangeDetectorRef,
        private mapService: MapService
    ) {
    }

    ngOnChanges(changes: SimpleChanges): void {
    }

    getDateByName(name: string): UntypedFormControl {
        return this.datePicker.get(name) as UntypedFormControl;
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        if (!this.formModel) {
            const form = new UntypedFormGroup({});
            this.formModel = new SentinelHubForm(form);
            this.formModel.setData({
                preset: this.presetDocument
            });
            this.formModel.build();
        }
        
        this.subscription.add(
            this.mapService.getSentinelKey().subscribe(value => {
                this.key = value;
                this.cdkRef.detectChanges();
            }
            )
        )

        if (this.formModel) {
            const time = this.formModel.getValue('time');
            if (time) {
                let [from, to] = time.split('/');

                const _from = from;
                const _to = to;

                if (!/(\d+)-(\d+)-(\d+)/.test(_from)) {
                    from = moment(_from, 'YYYY-MM-DD');
                }
                if (!/(\d+)-(\d+)-(\d+)/.test(_to)) {
                    to = moment(_to, 'YYYY-MM-DD');
                }
                if (/(\d+)/.test(_from)) {
                    from = moment(_from);
                }
                if (/(\d+)/.test(_to)) {
                    to = moment(_to);
                }
                this.datePicker.patchValue({ from, to });

                setTimeout(() => {
                    const dateFromInput = this.dateFrom?.el.nativeElement.querySelector('input');
                    const dateToInput = this.dateTo?.el.nativeElement.querySelector('input');

                    dateFromInput.value = moment(from, 'YYYY-MM-DD').format('YYYY-MM-DD');
                    dateToInput.value = moment(to, 'YYYY-MM-DD').format('YYYY-MM-DD');
                }, 100)
            }
        }

        this.subscription.add(
            this.datePicker.valueChanges.subscribe(value => {
                if (!value.from || !value.to) {
                    return;
                }

                const fromDate = value.from.format ? value.from.format('YYYY-MM-DD') : moment(value.from).format('YYYY-MM-DD')
                const toDate = value.to.format ? value.to.format('YYYY-MM-DD') : moment(value.to).format('YYYY-MM-DD')
                this.formModel?.setValue('time', fromDate + '/' + toDate);
            })
        );

        setTimeout(() => {
            if (this.isDisabled) {
                this.datePicker?.disable();
                this.formModel?.disable();
            }
        });

        // this.subscription.add(
        //     this.control.valueChanges.subscribe(value => this.generateImageLink(value))
        // );
    }

    ngAfterViewInit(): void {
        // this.generateImageLink(this.control.value, true);
    }

    get fromControl(): UntypedFormControl {
        return this.datePicker.get('from') as UntypedFormControl;
    }

    get toControl(): UntypedFormControl {
        return this.datePicker.get('to') as UntypedFormControl;
    }
}
