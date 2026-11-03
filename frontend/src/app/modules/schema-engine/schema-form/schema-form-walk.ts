import { AbstractControl } from '@angular/forms';
import { IFieldControl, IFieldIndexControl } from '../schema-form-model/field-form';

export interface IFormTarget {
    path: string;
    labels: string[];
    field: IFieldControl<any>;
    row?: IFieldIndexControl<any>;
    control: AbstractControl | null;
    requiredUnit: boolean;
}

/**
 * Walks the controls in document order: every field, then (for arrays) every row, then the
 * nested controls. `requiredUnit` marks the targets that count as one required answer:
 * visible, enabled, required leaves, and a required array as a whole.
 */
export function walkFields(controls: IFieldControl<any>[] | null | undefined): IFormTarget[] {
    const targets: IFormTarget[] = [];
    walk(controls || [], [], [], false, targets);
    return targets;
}

function walk(
    controls: IFieldControl<any>[],
    path: string[],
    labels: string[],
    insideRequiredArray: boolean,
    targets: IFormTarget[]
): void {
    for (const field of controls) {
        const fieldPath = [...path, field.name];
        const fieldLabels = [...labels, field.description || field.title || field.name];
        const visible = field.visibility !== false;
        const enabled = !!field.control && !field.control.disabled;
        const isUnit = !field.isRef || !!field.isArray;
        targets.push({
            path: fieldPath.join('.'),
            labels: fieldLabels,
            field,
            control: field.control,
            requiredUnit: !insideRequiredArray && visible && enabled && !!field.required && isUnit
        });
        if (field.isArray) {
            const inside = insideRequiredArray || (!!field.required && visible && enabled);
            (field.list || []).forEach((row, index) => {
                const rowPath = [...fieldPath, String(index)];
                const rowLabels = [...fieldLabels, `#${index + 1}`];
                targets.push({
                    path: rowPath.join('.'),
                    labels: rowLabels,
                    field,
                    row,
                    control: row.control,
                    requiredUnit: false
                });
                walk(row.model?.controls || [], rowPath, rowLabels, inside, targets);
            });
        } else {
            walk(field.model?.controls || [], fieldPath, fieldLabels, insideRequiredArray, targets);
        }
    }
}
