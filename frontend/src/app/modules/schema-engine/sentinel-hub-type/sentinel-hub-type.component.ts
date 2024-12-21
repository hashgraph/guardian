import { AfterViewInit, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MapService } from '../../../services/map.service';
import moment from 'moment';

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
})
export class SentinelHubTypeComponent implements OnInit, OnChanges, AfterViewInit {
    public key: string;
    subscription = new Subscription();
    @Input('formGroup') control: UntypedFormGroup;

    public get formattedImageLink(): string {
        if (!this.key) {
            return '';
        }

        if (this.control.valid) {
            const value = this.control.value;
            return `https://services.sentinel-hub.com/ogc/wms/${this.key}?REQUEST=GetMap&BBOX=${value.bbox}&FORMAT=${value.format}&LAYERS=${value.layers}&MAXCC=${value.maxcc}&WIDTH=${value.width}&HEIGHT=${value.height}&TIME=${value.time}`
        }

        return '';
    }
    @Input('preset') presetDocument: any = null;
    @Input('disabled') isDisabled: boolean = false;
    public datePicker = new UntypedFormGroup({
        from: new UntypedFormControl(null, Validators.required),
        to: new UntypedFormControl(null, Validators.required)
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
        this.control.registerControl('maxcc', new UntypedFormControl(undefined, Validators.required));
        this.control.registerControl('width', new UntypedFormControl(undefined, Validators.required));
        this.control.registerControl('height', new UntypedFormControl(undefined, Validators.required));
        this.control.registerControl('bbox', new UntypedFormControl('', Validators.required));
        this.control.registerControl('time', new UntypedFormControl(undefined, Validators.required));

        this.subscription.add(
            this.mapService.getSentinelKey().subscribe(value => {
                    this.key = value;
                }
            )
        )

        if (this.presetDocument) {
            this.control.patchValue(this.presetDocument);
            let [from, to] = this.control.get('time')?.value?.split('/') || [];

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
            this.datePicker.patchValue({from, to});

        }

        this.subscription.add(
            this.datePicker.valueChanges.subscribe(value => {
                if (!value.from || !value.to) {
                    return;
                }
                this.getControlByName('time').setValue(value.from?.format('YYYY-MM-DD') + '/' + value.to?.format('YYYY-MM-DD'));
            })
        );

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
