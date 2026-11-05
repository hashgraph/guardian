import { SchemaField } from '@guardian/interfaces';
import { FieldForm, IFieldControl } from '../schema-form-model/field-form';
import { fieldLabel, isFieldVisible } from '../schema-form/schema-form-walk';
import { IRailSection } from '../schema-form-rail/schema-form-rail.component';

export interface IFormSection extends IRailSection {
    /** The form that owns `controls` (the root form, or the promoted root sub-schema). */
    owner: FieldForm;
    controls: IFieldControl<any>[];
}

export const OTHER_DETAILS_SECTION_ID = 'sf-other-details';
export const OTHER_DETAILS_TITLE = 'Other details';

/**
 * The one split rule, shared by the edit form and the read-only view. Walking the items, the
 * plain ones collect until a sub-schema; that sub-schema closes the section and titles it
 * (`toSection(null, items, last)`). What is left after the last sub-schema becomes "Other
 * details" (F4, `toSection(title, items, null)`). Without a sub-schema there are no sections:
 * the document is a single page.
 */
export function splitSections<T, S>(
    items: T[],
    isSection: (item: T) => boolean,
    toSection: (title: string | null, items: T[], last: T | null) => S
): S[] {
    if (!items.some(isSection)) {
        return [];
    }
    const sections: S[] = [];
    let pending: T[] = [];
    for (const item of items) {
        pending.push(item);
        if (isSection(item)) {
            sections.push(toSection(null, pending, item));
            pending = [];
        }
    }
    if (pending.length) {
        sections.push(toSection(OTHER_DETAILS_TITLE, pending, null));
    }
    return sections;
}


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
    return splitSections<IFieldControl<any>, IFormSection>(
        controls,
        item => item.isRef,
        (title, items, last) => last
            ? { id: last.id, title: fieldLabel(last), owner, controls: items }
            : { id: OTHER_DETAILS_SECTION_ID, title: title!, owner, controls: items }
    );
}

/**
 * The name of the root sub-schema when the sections were built from it (N5 promotion notice).
 */
export function promotedRootName(model: FieldForm | null | undefined): string | null {
    const root = model ? promotedRoot(model) : null;
    return root ? fieldLabel(root) : null;
}

/** A section of a read-only document. */
export interface IViewSection extends IRailSection {
    fields: SchemaField[];
}

function viewLabel(field: SchemaField): string {
    return field.description || field.title || field.name;
}

/**
 * Single-root promotion (N5) of a read-only document: exactly one visible top-level non-array
 * sub-schema whose own fields hold a visible sub-schema. Its fields are then the sections.
 */
export function viewPromotedRoot(fields: SchemaField[], visible: (field: SchemaField) => boolean): SchemaField | null {
    const top = fields.filter(visible);
    if (top.length !== 1) {
        return null;
    }
    const [root] = top;
    if (!root.isRef || root.isArray || !root.fields?.length) {
        return null;
    }
    return (root.fields ?? []).some(item => visible(item) && item.isRef) ? root : null;
}

/**
 * Splits the fields of a read-only document by the same rule as the edit form. Fields that are
 * not visible are left out of the sections. `[]` means a flat document: there is no visible
 * sub-schema.
 */
export function buildViewSections(fields: SchemaField[], visible: (field: SchemaField) => boolean): IViewSection[] {
    const root = viewPromotedRoot(fields, visible);
    const items = (root ? root.fields ?? [] : fields).filter(visible);
    return splitSections<SchemaField, IViewSection>(
        items,
        item => item.isRef,
        (title, list, last) => last
            ? { id: last.name, title: viewLabel(last), fields: list }
            : { id: OTHER_DETAILS_SECTION_ID, title: title!, fields: list }
    );
}
