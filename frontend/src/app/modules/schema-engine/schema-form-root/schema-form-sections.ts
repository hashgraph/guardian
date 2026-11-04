import { FieldForm, IFieldControl } from '../schema-form-model/field-form';
import { fieldLabel, isFieldVisible } from '../schema-form/schema-form-walk';

export interface IFormSection {
    id: string;
    title: string;
    /** The form that owns `controls` (the root form, or the promoted root sub-schema). */
    owner: FieldForm;
    controls: IFieldControl<any>[];
}

export const OTHER_DETAILS_SECTION_ID = 'sf-other-details';


/**
 * Single-root promotion (N5): the form has exactly one visible top-level control, it is a
 * non-array sub-schema that was added (has a model) and its own controls hold a sub-schema.
 */
function promotedRoot(model: FieldForm): IFieldControl<any> | null {
    const visible = (model.controls || []).filter(isFieldVisible);
    if (visible.length !== 1) {
        return null;
    }
    const [root] = visible;
    if (!root.isRef || root.isArray || !root.model?.controls) {
        return null;
    }
    return (root.model.controls as IFieldControl<any>[]).some(item => isFieldVisible(item) && item.isRef) ? root : null;
}

/**
 * Splits a form into sections. Walking the visible top-level controls, simple fields collect
 * until a sub-schema (arrays included); that sub-schema closes the section and titles it.
 * Fields after the last sub-schema go into "Other details" (F4). A form without a visible
 * sub-schema has no sections: it is a single page.
 */
export function buildSections(model: FieldForm | null | undefined): IFormSection[] {
    if (!model?.controls) {
        return [];
    }
    const root = promotedRoot(model);
    const owner: FieldForm = root ? root.model : model;
    const controls: IFieldControl<any>[] = (owner.controls || []).filter(isFieldVisible);
    if (!controls.some(item => item.isRef)) {
        return [];
    }
    const sections: IFormSection[] = [];
    let pending: IFieldControl<any>[] = [];
    for (const item of controls) {
        pending.push(item);
        if (item.isRef) {
            sections.push({ id: item.id, title: fieldLabel(item), owner, controls: pending });
            pending = [];
        }
    }
    if (pending.length) {
        sections.push({ id: OTHER_DETAILS_SECTION_ID, title: 'Other details', owner, controls: pending });
    }
    return sections;
}

/**
 * The name of the root sub-schema when the sections were built from it (N5 promotion notice).
 */
export function promotedRootName(model: FieldForm | null | undefined): string | null {
    const root = model ? promotedRoot(model) : null;
    return root ? fieldLabel(root) : null;
}
