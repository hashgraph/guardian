import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function moreThanZeroValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (typeof value === 'number' && value > 0) {
            return null;
        }
        return {
            lessThanZero: {
                valid: false,
            },
        };
    };
}