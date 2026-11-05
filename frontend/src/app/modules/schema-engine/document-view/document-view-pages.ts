import { Schema, SchemaField, SchemaRuleValidateResult } from '@guardian/interfaces';
import { applyViewConditions } from '../schema-form-view/schema-form-view-conditions';
import { fieldLabel } from '../schema-form/schema-form-walk';
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
    /** The path the view marks the field with. */
    id: string;
    /** The field names from the section down to the field, as a field link. */
    path: string;
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

/** The fields of a sub-schema with its conditions judged by its own value. */
function viewChildren(field: SchemaField, value: unknown): ViewField[] {
    const children = (field.fields ?? []).map(copyField);
    applyViewConditions(children, field.conditions, value ?? {});
    return children;
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
                const children = viewChildren(field, value);
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
        const walk = (list: ViewField[], current: any, trail: string[]): void => {
            for (const field of list) {
                const value = current?.[field.name];
                if (!isShown(field, hide, value)) {
                    continue;
                }
                const isMap = field.customType === 'geo';
                if (isGroup(field)) {
                    const children = viewChildren(field, value);
                    walk(children, value, [...trail, field.name]);
                } else if (field.isArray && field.isRef && !isMap) {
                    // An array of sub-schemas: the first row stands for the list
                    const row = Array.isArray(value) ? value[0] : undefined;
                    const children = viewChildren(field, row);
                    walk(children, row, [...trail, field.name]);
                } else if (isMap && !isEmptyValue(value)) {
                    // A list of maps shows its first one
                    const first = field.isArray ? (value as unknown[])[0] : value;
                    if (!isEmptyValue(first)) {
                        found.push({
                            label: fieldLabel(field),
                            value: first,
                            sectionIndex,
                            sectionTitle: section.title,
                            id: field.fullPath ?? field.name,
                            path: [...trail, field.name].join('.'),
                        });
                    }
                }
            }
        };
        walk(section.fields as ViewField[], values, []);
    });
    return found;
}

export interface IViewCard {
    id: string;
    title: string;
}

/**
 * The sub-schemas inside the sub-schemas of a section: the sub-rows the rail lists under the
 * open section, as in the edit form. The id is the field path the view marks its sub-headings with.
 */
export function sectionCards(section: IViewSection, values: any, hide: { [x: string]: boolean }): IViewCard[] {
    const cards: IViewCard[] = [];
    for (const field of section.fields as ViewField[]) {
        if (!isGroup(field)) {
            continue;
        }
        const value = values?.[field.name];
        if (!isShown(field, hide, value)) {
            continue;
        }
        const children = viewChildren(field, value);
        for (const child of children) {
            if (isGroup(child) && isShown(child, hide, value?.[child.name])) {
                cards.push({ id: child.fullPath ?? child.name, title: fieldLabel(child) });
            }
        }
    }
    return cards;
}

/** One card of a section page: a first-level sub-schema with its own heading, or the plain fields around it. */
export interface IPageBlock {
    key: string;
    /** The heading of the card; null for plain fields. */
    title: string | null;
    /** The path the view marks the sub-heading with; the rail card scrolls to it. */
    id?: string;
    fields: ViewField[];
    values: any;
    /** The path of `values`, for the metadata strip. */
    prefix: string;
    /** The names that lead to `values`, so a field link can be handed to the right card. */
    linkPrefix: string;
    /** An optional sub-schema that was never added. */
    empty: boolean;
}

/**
 * Splits a section page into cards, the way the mockup does: each sub-schema inside the section's
 * sub-schema gets a card of its own, and the plain fields around them share a card with no heading.
 */
export function sectionBlocks(section: IViewSection, values: any, prefix: string, hide: { [x: string]: boolean }): IPageBlock[] {
    const blocks: IPageBlock[] = [];
    const add = (fields: ViewField[], current: any, path: string, link: string, extra: Partial<IPageBlock> = {}): void => {
        if (!fields.length && !extra.title) {
            return;
        }
        blocks.push({
            key: `${blocks.length}:${extra.id ?? ''}`,
            title: null, fields, values: current, prefix: path, linkPrefix: link, empty: false, ...extra,
        });
    };
    let lead: ViewField[] = [];
    for (const field of section.fields as ViewField[]) {
        const value = values?.[field.name];
        if (!isGroup(field) || !isShown(field, hide, value)) {
            lead.push(field);
            continue;
        }
        add(lead, values, prefix, '');
        lead = [];
        const children = viewChildren(field, value);
        const base = `${prefix}${field.name}.`;
        const link = `${field.name}.`;
        let own: ViewField[] = [];
        for (const child of children) {
            const childValue = value?.[child.name];
            if (isGroup(child) && isShown(child, hide, childValue)) {
                add(own, value, base, link);
                own = [];
                const inner = viewChildren(child, childValue);
                add(inner, childValue, `${base}${child.name}.`, `${link}${child.name}.`, {
                    title: fieldLabel(child),
                    id: child.fullPath ?? child.name,
                    empty: isEmptyValue(childValue) || (typeof childValue === 'object' && !Array.isArray(childValue) && Object.keys(childValue).length === 0),
                });
            } else {
                own.push(child);
            }
        }
        add(own, value, base, link);
    }
    add(lead, values, prefix, '');
    return blocks;
}
