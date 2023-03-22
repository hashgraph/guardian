import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { fullFormats } from 'ajv-formats/dist/formats';

export function uriValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        let errors = null;
        try {
            const uriValidatorFn = fullFormats.uri as (value: any) => boolean;
            if (!uriValidatorFn(control.value)) {
                errors = {
                    uri: {
                        valid: false,
                    },
                };
            }
        } catch {
            errors = {
                uri: {
                    valid: false,
                },
            };
        }
        return errors;
    };
}
