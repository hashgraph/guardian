import { IFieldControl } from '../schema-form-model/field-form';
import { walkFields } from './schema-form-walk';

export interface IRequiredCount {
    answered: number;
    total: number;
}

/**
 * Counts the required answers (F5): visible, enabled, required leaves and required arrays as
 * one unit each. An array is answered when it has at least one row and all rows are valid.
 * An optional sub-schema that was not added has no control and contributes nothing.
 */
export function countRequired(controls: IFieldControl<any>[] | null | undefined): IRequiredCount {
    let answered = 0;
    let total = 0;
    for (const target of walkFields(controls)) {
        if (!target.requiredUnit || target.row) {
            continue;
        }
        total++;
        const isAnswered = !!target.control?.valid
            && (!target.field.isArray || (target.field.list?.length ?? 0) > 0);
        if (isAnswered) {
            answered++;
        }
    }
    return { answered, total };
}
