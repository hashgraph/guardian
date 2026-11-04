import { IFieldControl } from '../schema-form-model/field-form';
import { IFormTarget, walkFields } from './schema-form-walk';

export interface IRequiredCount {
    answered: number;
    total: number;
}

/**
 * A required unit is answered when its control is valid; an array also needs at least one row.
 */
export function isAnswered(target: IFormTarget): boolean {
    return !!target.control?.valid && (!target.field.isArray || (target.field.list?.length ?? 0) > 0);
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
        if (isAnswered(target)) {
            answered++;
        }
    }
    return { answered, total };
}

export interface ISectionCompletion extends IRequiredCount {
    id: string;
    title: string;
    hasErrors: boolean;
}

export interface IFormCompletion extends IRequiredCount {
    sections: ISectionCompletion[];
}

/**
 * True when a visible, enabled leaf (or array row) in the controls is invalid.
 */
export function hasInvalidFields(controls: IFieldControl<any>[] | null | undefined): boolean {
    return walkFields(controls).some(target => {
        if (target.hidden || !target.control?.invalid) {
            return false;
        }
        if (target.row) {
            return !target.field.isRef;
        }
        return !target.field.isRef || !!target.field.isArray;
    });
}

/**
 * Completion of a form: overall and per section. A form without sections counts its own controls.
 */
export function computeCompletion(
    controls: IFieldControl<any>[] | null | undefined,
    sections: { id: string; title: string; controls: IFieldControl<any>[] }[]
): IFormCompletion {
    if (!sections.length) {
        return { ...countRequired(controls), sections: [] };
    }
    const result: ISectionCompletion[] = sections.map(section => ({
        id: section.id,
        title: section.title,
        ...countRequired(section.controls),
        hasErrors: hasInvalidFields(section.controls)
    }));
    return {
        answered: result.reduce((sum, item) => sum + item.answered, 0),
        total: result.reduce((sum, item) => sum + item.total, 0),
        sections: result
    };
}
