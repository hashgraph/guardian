import { UntypedFormControl } from '@angular/forms';
import { ajvSchemaValidator } from 'src/app/validators/ajv-schema.validator';
import ajv from 'ajv';
import { GeoJsonSchema } from '@guardian/interfaces';

export class GeoForm {
    private readonly form: UntypedFormControl;
    private presetDocument: any;

    constructor(form: UntypedFormControl) {
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
        this.form.setValidators(
            ajvSchemaValidator(new ajv().compile(GeoJsonSchema))
        );
        if (this.presetDocument) {
            const type = this.presetDocument.type;
            const coordinates = this.presetDocument.coordinates;
            this.form.patchValue({
                type,
                coordinates,
            }, { emitEvent: false, onlySelf: true });

        }

        // this.form.updateValueAndValidity();
    }

    public setControlValue(value: any, dirty = true) {
        this.form?.patchValue(value);
        if (dirty) {
            this.form?.markAsDirty();
        }
    }

    public getValue() {
        return this.form?.value;
    }
}