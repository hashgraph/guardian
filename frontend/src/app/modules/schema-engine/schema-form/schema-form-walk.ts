import { AbstractControl, UntypedFormControl } from '@angular/forms';
import { IFieldControl, IFieldIndexControl } from '../schema-form-model/field-form';

export interface IFormTarget {
    path: string;
    labels: string[];
    field: IFieldControl<any>;
    row?: IFieldIndexControl<any>;
    control: AbstractControl | null;
    requiredUnit: boolean;
    /** The field, or a field above it, is not shown or is disabled. */
    hidden: boolean;
}

/**
 * Walks the controls in document order: every field, then (for arrays) every row, then the
 * nested controls. `requiredUnit` marks the targets that count as one required answer:
 * visible, enabled, required leaves, and a required array as a whole.
 */
export function walkFields(controls: IFieldControl<any>[] | null | undefined): IFormTarget[] {
    const targets: IFormTarget[] = [];
    walk(controls || [], [], [], false, false, targets);
    return targets;
}

export function fieldLabel(field: IFieldControl<any>): string {
    return field.description || field.title || field.name;
}

/**
 * A sub-schema (ref) is a container whose nested fields report their own errors, except the
 * custom types (GeoJSON, Sentinel Hub): their control is one value with no nested fields, so
 * the control itself is the answer and the issue.
 */
export function isRefLeaf(control: AbstractControl | null | undefined): boolean {
    return control instanceof UntypedFormControl;
}

/** A row index inside a dotted path, for example the `0` in `rows.0.name`. */
export function isIndexSegment(part: string): boolean {
    return /^\d+$/.test(part);
}

export function isFieldVisible(field: IFieldControl<any>): boolean {
    return field.visibility !== false;
}

function walk(
    controls: IFieldControl<any>[],
    path: string[],
    labels: string[],
    insideRequiredArray: boolean,
    ancestorHidden: boolean,
    targets: IFormTarget[]
): void {
    for (const field of controls) {
        const fieldPath = [...path, field.name];
        const fieldLabels = [...labels, fieldLabel(field)];
        const visible = isFieldVisible(field);
        const enabled = !!field.control && !field.control.disabled;
        const isUnit = !field.isRef || !!field.isArray || isRefLeaf(field.control);
        const hidden = ancestorHidden || !visible || !!field.control?.disabled;
        targets.push({
            path: fieldPath.join('.'),
            labels: fieldLabels,
            field,
            control: field.control,
            requiredUnit: !insideRequiredArray && !hidden && !!field.required && isUnit,
            hidden
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
                    requiredUnit: false,
                    hidden
                });
                walk(row.model?.controls || [], rowPath, rowLabels, inside, hidden, targets);
            });
        } else {
            walk(field.model?.controls || [], fieldPath, fieldLabels, insideRequiredArray, hidden, targets);
        }
    }
}
