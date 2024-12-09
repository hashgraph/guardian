import { AfterViewInit, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { Subscription } from 'rxjs';
import { MapService } from '../../../services/map.service';
import * as moment from 'moment';

const MY_FORMATS = {
    parse: {
        dateInput: 'l, LT',
    },
    display: {
        dateInput: 'YYYY-MM-DD',
        monthYearLabel: 'MM yyyy',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    }
};

@Component({
    selector: 'app-sentinel-hub-type',
    templateUrl: './sentinel-hub-type.component.html',
    styleUrls: ['./sentinel-hub-type.component.scss'],
    providers: [
        {provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter},
        {provide: NGX_MAT_DATE_FORMATS, useValue: MY_FORMATS},
    ],
})
export class SentinelHubTypeComponent implements OnInit, OnChanges, AfterViewInit {
    public key: string;
    subscription = new Subscription();
    @Input('formGroup') control: UntypedFormGroup;
    public formattedImageLink = ''
    @Input('preset') presetDocument: any = null;
    @Input('disabled') isDisabled: boolean = false;
    public datePicker = new UntypedFormGroup({
        from: new UntypedFormControl(),
        to: new UntypedFormControl()
    });
    protected readonly FormControl = UntypedFormControl;

    constructor(
        private cdkRef: ChangeDetectorRef,
        private mapService: MapService
    ) {
    }

    ngOnChanges(changes: SimpleChanges): void {
    }

    get formControl(): UntypedFormGroup {
        return this.control || new UntypedFormGroup({})
    }

    getControlByName(name: string): UntypedFormControl {
        return this.control.get(name) as UntypedFormControl;
    }

    getDateByName(name: string): UntypedFormControl {
        return this.datePicker.get(name) as UntypedFormControl;
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        if (!this.control) {
            this.control = new UntypedFormGroup({});
        }

        this.control.registerControl('layers', new UntypedFormControl('NATURAL-COLOR', Validators.required));
        this.control.registerControl('format', new UntypedFormControl('image/jpeg', Validators.required));
        this.control.registerControl('maxcc', new UntypedFormControl(30, Validators.required));
        this.control.registerControl('width', new UntypedFormControl(512, Validators.required));
        this.control.registerControl('height', new UntypedFormControl(512, Validators.required));
        this.control.registerControl('bbox', new UntypedFormControl('', Validators.required));
        this.control.registerControl('time', new UntypedFormControl(undefined, Validators.required));

        this.subscription.add(
            this.mapService.getSentinelKey().subscribe(value => {
                this.key = value;
                if (this.presetDocument) {
                    this.generateImageLink(this.control.value, true);
                }
            })
        )

        this.subscription.add(
            this.datePicker.valueChanges.subscribe(value => {
                if ((typeof value.from?.format === 'function') && (value.to?.format === 'function')) {
                    this.getControlByName('time').setValue(value.from?.format('YYYY-MM-DD') + '/' + value.to?.format('YYYY-MM-DD'));
                }
                this.getControlByName('time').setValue((value.from + '/' + value.to));
            })
        );

        this.subscription.add(
            this.control.valueChanges.subscribe(value => this.generateImageLink(value))
        )
    }

    ngAfterViewInit(): void {
        console.log(this.presetDocument);
        if (this.presetDocument) {
            setTimeout(() => {
                this.control.patchValue(this.presetDocument);
                let [from, to] = this.control.get('time')?.value?.split('/') || [];
                console.log({from, to});
                if (!/(\d+)-(\d+)-(\d+)/.test(from)) {
                    from = moment(from).format('YYYY-MM-DD');
                }
                if (!/(\d+)-(\d+)-(\d+)/.test(from)) {
                    from = moment(from).format('YYYY-MM-DD');
                }
                this.datePicker.patchValue({from, to});
                this.generateImageLink(this.control.value, true);
            }, 200);

        }
    }

    generateImageLink(value: any, skipValidation = false): void {
        if (!this.key) {
            this.formattedImageLink = '';
            return;
        }

        if (skipValidation || this.control.valid) {
            this.formattedImageLink = `https://services.sentinel-hub.com/ogc/wms/${this.key}?REQUEST=GetMap&BBOX=${value.bbox}&FORMAT=${value.format}&LAYERS=${value.layers}&MAXCC=${value.maxcc}&WIDTH=${value.width}&HEIGHT=${value.height}&TIME=${value.time}`
        }
    }
}
