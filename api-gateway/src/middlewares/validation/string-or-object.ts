import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'string-or-object', async: false })
export class IsStringOrObject implements ValidatorConstraintInterface {
    validate(text: any, args: ValidationArguments) {
        return typeof text === 'object' || typeof text === 'string';
    }

    defaultMessage(args: ValidationArguments) {
        return '($value) must be object or string';
    }
}