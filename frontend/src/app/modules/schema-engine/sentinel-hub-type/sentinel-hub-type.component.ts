import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DATETIME_FORMATS } from '../schema-form/schema-form.component';
import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { Subscription } from 'rxjs';
import { MapService } from '../../../services/map.service';

@Component({
    selector: 'app-sentinel-hub-type',
    templateUrl: './sentinel-hub-type.component.html',
    styleUrls: ['./sentinel-hub-type.component.scss'],
    providers: [
        {provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter},
        {provide: NGX_MAT_DATE_FORMATS, useValue: DATETIME_FORMATS}
    ]
})
export class SentinelHubTypeComponent implements OnInit, OnChanges {
    public key: string;
    subscription = new Subscription();
    @Input('formGroup') control: FormGroup;
    public formattedImageLink = ''
    @Input('preset') presetDocument: any = null;
    @Input('disabled') isDisabled: boolean = false;
    public datePicker = new FormGroup({
        from: new FormControl(),
        to: new FormControl()
    });
    protected readonly FormControl = FormControl;

    constructor(
        private cdkRef: ChangeDetectorRef,
        private mapService: MapService
    ) {
    }

    ngOnChanges(changes: SimpleChanges): void {
    }

    get formControl(): FormGroup {
        return this.control || new FormGroup({})
    }

    getControlByName(name: string): FormControl {
        return this.control.get(name) as FormControl;
    }

    getDateByName(name: string): FormControl {
        return this.datePicker.get(name) as FormControl;
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.control.registerControl('layers', new FormControl('NATURAL-COLOR', Validators.required));
        this.control.registerControl('format', new FormControl('image/jpeg', Validators.required));
        this.control.registerControl('maxcc', new FormControl(30, Validators.required));
        this.control.registerControl('width', new FormControl(512, Validators.required));
        this.control.registerControl('height', new FormControl(512, Validators.required));
        this.control.registerControl('bbox', new FormControl('', Validators.required));
        this.control.registerControl('time', new FormControl(undefined, Validators.required));

        this.subscription.add(
            this.mapService.getSentinelKey().subscribe(value => {
                this.key = value;
            })
        )

        this.subscription.add(
            this.datePicker.valueChanges.subscribe(value => {
                this.getControlByName('time').setValue(value.from?.format('YYYY-MM-DD') + '/' + value.to?.format('YYYY-MM-DD'))
            })
        );

        this.subscription.add(
            this.control.valueChanges.subscribe(value => {
                if (!this.key) {
                    this.formattedImageLink = '';
                    return;
                }

                if (this.control.valid) {
                    this.formattedImageLink = `https://services.sentinel-hub.com/ogc/wms/${this.key}?REQUEST=GetMap&BBOX=${value.bbox}&FORMAT=${value.format}&LAYERS=${value.layers}&MAXCC=${value.maxcc}&WIDTH=${value.width}&HEIGHT=${value.height}&TIME=${value.time}`
                }
            })
        )
    }
}
