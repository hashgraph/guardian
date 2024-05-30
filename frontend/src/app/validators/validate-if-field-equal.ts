import { AbstractControl, ValidatorFn } from '@angular/forms';

export function ValidateIfFieldEqual(fieldName: string, value: any, validators: ValidatorFn[]) {
    return (control: AbstractControl) => {
        const field = control.parent?.get(fieldName);
        if (!field) {
            return null;
        }
        if (field.value !== value) {
            return null;
        }
        let errors = null;
        for (const validator of validators) {
            const result = validator(control);
            if (result !== null) {
                if (!errors) {
                    errors = {};
                }
                Object.assign(errors, result);
            }
        }
        return errors;
    }
}
