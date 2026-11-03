import { UntypedFormControl, Validators } from '@angular/forms';
import { getErrorMessage, showError } from './schema-form-errors';

describe('schema form errors', () => {
    const item = (props: any, control: UntypedFormControl): any => ({ id: 'f1', control, ...props });
    const required = () => new UntypedFormControl(null, Validators.required);

    it('names the missing action by field kind', () => {
        expect(getErrorMessage(item({ type: 'string' }, required()))).toBe('Enter a value');
        expect(getErrorMessage(item({ type: 'string', enum: ['a'] }, required()))).toBe('Select a value');
        expect(getErrorMessage(item({ type: 'boolean' }, required()))).toBe('Select a value');
        expect(getErrorMessage(item({ type: 'string', customType: 'file' }, required()))).toBe('Add a value');
        expect(getErrorMessage(item({ type: 'string', pattern: '^ipfs:\/\/.+' }, required()))).toBe('Add a value');
    });

    it('returns the IPFS validator string as is', () => {
        const control = new UntypedFormControl('x', () => ({ f1: 'Invalid IPFS CID/URL' }));
        expect(getErrorMessage(item({ type: 'string' }, control))).toBe('Invalid IPFS CID/URL');
    });

    it('describes pattern and number errors by format', () => {
        const pattern = new UntypedFormControl('x', Validators.pattern(/^a$/));
        expect(getErrorMessage(item({ type: 'string', format: 'email' }, pattern))).toBe('Enter a valid email address');
        expect(getErrorMessage(item({ type: 'string', format: 'url' }, pattern)))
            .toBe('Enter a valid URL, for example https://example.com');
        expect(getErrorMessage(item({ type: 'string', format: 'duration' }, pattern)))
            .toBe('Enter a duration, for example P1D');
        expect(getErrorMessage(item({ type: 'string' }, pattern))).toBe('Doesn\'t match the required format');
        const number = new UntypedFormControl('x', () => ({ isNotNumber: true }));
        expect(getErrorMessage(item({ type: 'number' }, number))).toBe('Enter a number');
        expect(getErrorMessage(item({ type: 'integer' }, number))).toBe('Enter a whole number');
    });

    it('describes arrays and sub-schemas', () => {
        const control = new UntypedFormControl('x', () => ({ any: true }));
        expect(getErrorMessage(item({ isArray: true }, control))).toBe('Fix the highlighted entries');
        expect(getErrorMessage(item({ isRef: true }, control))).toBe('Fix the fields in this group');
    });

    it('shows an error after blur, for prefilled values or once revealed', () => {
        const control = required();
        const field = item({}, control);
        expect(showError(field, false)).toBeFalse();
        control.markAsTouched();
        expect(showError(field, false)).toBeTrue();
        const untouched = item({}, required());
        expect(showError(untouched, true)).toBeTrue();
        expect(showError({ ...untouched, prefilled: true }, false)).toBeTrue();
    });

    it('never shows an error for a valid or disabled control', () => {
        const valid = new UntypedFormControl('x', Validators.required);
        valid.markAsTouched();
        expect(showError(item({}, valid), true)).toBeFalse();
        const disabled = required();
        disabled.disable();
        expect(showError(item({}, disabled), true)).toBeFalse();
    });
});
