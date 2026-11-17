import { IFieldControl } from '../schema-form-model/field-form';
import { IFormTarget, isIndexSegment, walkFields } from './schema-form-walk';

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
 * Required paths that have no control yet: a sub-schema that was not added, or a field inside it.
 * A cell of a table row that does not exist, a path that has a control, and a hidden path or one
 * whose nearest existing parent is hidden or missing are left out.
 */
export function requiredWithoutControl(
    controls: IFieldControl<any>[] | null | undefined,
    paths: string[] | null | undefined
): string[] {
    const targets = new Map(walkFields(controls).map(target => [target.path, target]));
    const result: string[] = [];
    for (const path of paths || []) {
        const parts = path.split('.');
        if (result.includes(path)) {
            continue;
        }
        const own = targets.get(path);
        if (own) {
            if (!own.control && !own.hidden) {
                result.push(path);
            }
            continue;
        }
        let length = parts.length - 1;
        let parent = targets.get(parts.slice(0, length).join('.'));
        while (!parent && length > 1) {
            length--;
            parent = targets.get(parts.slice(0, length).join('.'));
        }
        const missingRow = parts.slice(length).some(isIndexSegment);
        if (parent && !parent.hidden && !missingRow) {
            result.push(path);
        }
    }
    return result;
}

/**
 * Completion of a form: overall and per section. A form without sections counts its own controls.
 * `withoutControl` holds one section index per required field that has no control yet; each
 * counts as one unanswered unit (-1 when the form has no sections).
 */
export function computeCompletion(
    controls: IFieldControl<any>[] | null | undefined,
    sections: { id: string; title: string; controls: IFieldControl<any>[] }[],
    withoutControl: number[] = []
): IFormCompletion {
    if (!sections.length) {
        const own = countRequired(controls);
        return { answered: own.answered, total: own.total + withoutControl.length, sections: [] };
    }
    const result: ISectionCompletion[] = sections.map((section, index) => {
        const own = countRequired(section.controls);
        return {
            id: section.id,
            title: section.title,
            answered: own.answered,
            total: own.total + withoutControl.filter(item => item === index).length,
            hasErrors: hasInvalidFields(section.controls)
        };
    });
    return {
        answered: result.reduce((sum, item) => sum + item.answered, 0),
        total: result.reduce((sum, item) => sum + item.total, 0),
        sections: result
    };
}
