import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

export class SentinelHubForm {
    private readonly form: UntypedFormGroup;
    private presetDocument: any;

    constructor(form: UntypedFormGroup) {
        this.form = form;
        this.presetDocument = null;
    }

    public setData(data: {
        preset: any;
    }) {
        if (data.preset) {
            this.presetDocument = data.preset;
        }
    }

    public build() {
        this.form.registerControl('layers', new UntypedFormControl('NATURAL-COLOR', Validators.required));
        this.form.registerControl('format', new UntypedFormControl('image/jpeg', Validators.required));
        this.form.registerControl('maxcc', new UntypedFormControl(undefined, Validators.required));
        this.form.registerControl('width', new UntypedFormControl(undefined, Validators.required));
        this.form.registerControl('height', new UntypedFormControl(undefined, Validators.required));
        this.form.registerControl('bbox', new UntypedFormControl('', Validators.required));
        this.form.registerControl('time', new UntypedFormControl(undefined, Validators.required));

        if (this.presetDocument) {
            this.form.patchValue(this.presetDocument, { emitEvent: false, onlySelf: true });
        }

        // this.form.updateValueAndValidity();
    }

    public getControlByName(name: string): UntypedFormControl {
        return this.form.get(name) as UntypedFormControl;
    }

    public setValue(name: string, value: any) {
        this.getControlByName(name).setValue(value);
    }

    public getValue(name: string) {
        return this.form.get(name)?.value;
    }

    public disable() {
        this.form.disable();
    }

    public formattedImageLink(key: string): string {
        if (!key) {
            return '';
        }
        if (this.form.valid || this.form.disabled) {
            const value = this.form.value;
            if (!value.bbox || !value.format || !value.layers || !value.maxcc || !value.width || !value.height || !value.time) {
                return '';
            }
            return `https://services.sentinel-hub.com/ogc/wms/${key}?REQUEST=GetMap&BBOX=${value.bbox}&FORMAT=${value.format}&LAYERS=${value.layers}&MAXCC=${value.maxcc}&WIDTH=${value.width}&HEIGHT=${value.height}&TIME=${value.time}`
        }

        return '';
    }
}