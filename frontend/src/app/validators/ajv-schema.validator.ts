import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ValidateFunction } from 'ajv';

export function ajvSchemaValidator(
    validateFunction: ValidateFunction
): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        let errors = null;
        try {
            if (!validateFunction(control.value)) {
                errors = {
                    ajv: {
                        valid: false,
                    },
                };
            }
        } catch {
            errors = {
                ajv: {
                    valid: false,
                },
            };
        }
        return errors;
    };
}
