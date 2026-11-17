import { isGeoCustomType } from '@guardian/interfaces';
import { IFieldControl, IFieldIndexControl } from '../schema-form-model/field-form';

const IPFS_GATEWAY_PATTERN = '^((https):\/\/)?ipfs.io\/ipfs\/.+';
const IPFS_SCHEME_PATTERN = '^ipfs:\/\/.+';

const URI_MESSAGE = 'Enter a valid URI, for example example:uri';

const FORMAT_MESSAGES: Record<string, string> = {
    email: 'Enter a valid email address',
    url: 'Enter a valid URL, for example https://example.com',
    duration: 'Enter a duration, for example P1D'
};

function requiredMessage(item: IFieldControl<any>): string {
    const customType = item.customType || '';
    if (item.isArray || item.isRef || customType === 'geo' || customType === 'table' || customType === 'file'
        || item.pattern === IPFS_GATEWAY_PATTERN || item.pattern === IPFS_SCHEME_PATTERN) {
        return 'Add a value';
    }
    if (item.enum || item.remoteLink || item.type === 'boolean' || isGeoCustomType(customType)) {
        return 'Select a value';
    }
    return 'Enter a value';
}

/**
 * Message for the first error of the control, keyed on the control's error keys.
 */
export function getErrorMessage(item: IFieldControl<any>, listItem?: IFieldIndexControl<any>): string {
    const control = listItem?.control || item.control;
    const errors = control?.errors || {};
    const type = item.format || item.type;

    if (typeof errors[item.id] === 'string') {
        return errors[item.id];
    }
    if (item.isRef) {
        return item.isArray ? 'Fix the highlighted entries' : 'Fix the fields in this group';
    }
    if (item.isArray && !listItem) {
        return errors['required'] ? 'Add a value' : 'Fix the highlighted entries';
    }
    if (errors['required']) {
        return requiredMessage(item);
    }
    if (errors['isNotNumber']) {
        return type === 'integer' ? 'Enter a whole number' : 'Enter a number';
    }
    if (errors['uri'] || (type === 'uri' && !errors['pattern'])) {
        return URI_MESSAGE;
    }
    if (errors['pattern']) {
        return FORMAT_MESSAGES[type] || 'Doesn\'t match the required format';
    }
    return FORMAT_MESSAGES[type] || (type === 'integer' ? 'Enter a whole number' : 'Enter a valid value');
}

/**
 * An error is shown once the field was left, or after a submit attempt revealed all errors (`revealed`, from the root form).
 * A group or array holds child controls, and touching a child marks every parent
 * touched, so a container only reports once revealed.
 */
export function showError(
    item: IFieldControl<any>,
    revealed: boolean,
    listItem?: IFieldIndexControl<any>
): boolean {
    const control = listItem?.control || item.control;
    if (!control || control.valid || control.disabled) {
        return false;
    }
    const isContainer = !listItem && (item.isRef || item.isArray);
    return (!isContainer && control.touched) || revealed;
}
