import { Schema, SchemaField, SchemaRuleValidateResult } from '@guardian/interfaces';
import { applyViewConditions } from '../schema-form-view/schema-form-view-conditions';
import { IViewSection, buildViewSections, viewPromotedRoot } from '../schema-form-root/schema-form-sections';

/** A field of the read-only view: the schema field plus the mark the conditions leave on it. */
export type ViewField = SchemaField & { notCorrespondCondition?: boolean };

export interface IViewStats {
    /** Fields that are shown. */
    total: number;
    /** Shown fields with no value. */
    missing: number;
    /** Failed rule checks. */
    warnings: number;
    comments: number;
}

export interface ISubjectView {
    /** Empty for a flat document. */
    sections: IViewSection[];
    /** The fields of a flat document. */
    fields: ViewField[];
    /** What the section fields are read from: the subject, or the promoted root's value. */
    values: any;
    pathPrefix: string;
    rootName: string | null;
}

export interface IViewContext {
    hide: { [x: string]: boolean };
    rules?: SchemaRuleValidateResult | null;
    discussion?: { [path: string]: number } | null;
}

export interface IViewLocation {
    label: string;
    value: any;
    sectionIndex: number;
    sectionTitle: string;
}

export function isEmptyValue(value: unknown): boolean {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

/** A sub-schema that has fields of its own; the map types are one value. */
function isGroup(field: SchemaField): boolean {
    return field.isRef && !field.isArray && field.customType !== 'geo' && field.customType !== 'sentinel';
}

function copyField(field: SchemaField): ViewField {
    return { ...field } as ViewField;
}

/** Same filter as the field list of the view: hidden, help text and fields of a failed condition are not shown. */
function isShown(field: ViewField, hide: { [x: string]: boolean }, value: unknown): boolean {
    if (hide?.[field.name] || field.type === 'null' || field.notCorrespondCondition) {
        return false;
    }
    return !(field.hidden && isEmptyValue(value));
}

/**
 * The fields of one credential subject, split into sections. The schema's fields are shared by
 * every subject of the type and the conditions mark them, so each subject works on copies.
 */
export function buildSubjectView(schema: Schema | null | undefined, subject: any, hide: { [x: string]: boolean }): ISubjectView {
    const fields: ViewField[] = (schema?.fields ?? []).map(copyField);
    applyViewConditions(fields, schema?.conditions, subject);
    let rootValue: any;
    const rootChildren = new Set<ViewField>();
    const visible = (field: SchemaField): boolean =>
        isShown(field as ViewField, hide, (rootChildren.has(field as ViewField) ? rootValue : subject)?.[field.name]);
    const root = viewPromotedRoot(fields, visible);
    if (root) {
        rootValue = subject?.[root.name];
        const index = fields.indexOf(root as ViewField);
        const copy = { ...root, fields: (root.fields ?? []).map(copyField) } as ViewField;
        fields[index] = copy;
        applyViewConditions(copy.fields as ViewField[], copy.conditions, rootValue ?? {});
        (copy.fields as ViewField[]).forEach(item => rootChildren.add(item));
    }
    const sections = buildViewSections(fields, visible);
    const promoted = sections.length ? viewPromotedRoot(fields, visible) : null;
    return {
        sections,
        fields: sections.length ? [] : fields.filter(visible),
        values: promoted ? rootValue ?? {} : subject,
        pathPrefix: promoted ? `${promoted.name}.` : '',
        rootName: promoted?.name ?? null,
    };
}

/** Field counts of a section; a sub-schema is walked, an array and everything else is one field. */
export function fieldStats(fields: SchemaField[], values: any, context: IViewContext): IViewStats {
    const stats: IViewStats = { total: 0, missing: 0, warnings: 0, comments: 0 };
    const walk = (list: ViewField[], current: any): void => {
        for (const field of list) {
            const value = current?.[field.name];
            if (!isShown(field, context.hide, value)) {
                continue;
            }
            if (isGroup(field)) {
                const children = (field.fields ?? []).map(copyField);
                applyViewConditions(children, field.conditions, value ?? {});
                walk(children, value);
                continue;
            }
            stats.total++;
            if (isEmptyValue(value)) {
                stats.missing++;
            }
            const status = context.rules?.[field.fullPath ?? '']?.status;
            if (status === 'Failure' || status === 'Error') {
                stats.warnings++;
            }
            stats.comments += context.discussion?.[field.fullPath ?? ''] ?? 0;
        }
    };
    walk(fields as ViewField[], values);
    return stats;
}

export function sumStats(list: IViewStats[]): IViewStats {
    return list.reduce((sum, item) => ({
        total: sum.total + item.total,
        missing: sum.missing + item.missing,
        warnings: sum.warnings + item.warnings,
        comments: sum.comments + item.comments,
    }), { total: 0, missing: 0, warnings: 0, comments: 0 });
}

/** The filled GeoJSON fields of the sections, for the Overview's Location panel. */
export function collectLocations(sections: IViewSection[], values: any, hide: { [x: string]: boolean }): IViewLocation[] {
    const found: IViewLocation[] = [];
    sections.forEach((section, sectionIndex) => {
        const walk = (list: ViewField[], current: any): void => {
            for (const field of list) {
                const value = current?.[field.name];
                if (!isShown(field, hide, value)) {
                    continue;
                }
                if (isGroup(field)) {
                    const children = (field.fields ?? []).map(copyField);
                    applyViewConditions(children, field.conditions, value ?? {});
                    walk(children, value);
                } else if (!field.isArray && field.customType === 'geo' && !isEmptyValue(value)) {
                    found.push({
                        label: field.description || field.title || field.name,
                        value,
                        sectionIndex,
                        sectionTitle: section.title,
                    });
                }
            }
        };
        walk(section.fields as ViewField[], values);
    });
    return found;
}
