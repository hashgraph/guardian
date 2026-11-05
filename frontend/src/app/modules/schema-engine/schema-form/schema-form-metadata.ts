export interface IMetaTag {
    text: string;
    title?: string;
}

interface IMetaField {
    type?: string;
    format?: string;
    customType?: string;
    isRef?: boolean;
    isArray?: boolean;
    enumValues?: unknown;
    unit?: string;
    default?: unknown;
}

/** The type line of the field metadata strip, for example `array · string · date`. */
export function metaType(field: IMetaField): string {
    const base = field.customType
        || (field.isRef ? 'object · sub-schema' : null)
        || (field.format ? `${field.type} · ${field.format}` : String(field.type || ''));
    return field.isArray ? `array · ${base}` : base;
}

/** The tags that come from the schema alone: allowed values, unit and default. */
export function baseMetaTags(field: IMetaField): IMetaTag[] {
    const tags: IMetaTag[] = [];
    const values: unknown[] = Array.isArray(field.enumValues) ? field.enumValues : [];
    if (values.length) {
        tags.push({
            text: `${values.length} allowed value${values.length === 1 ? '' : 's'}`,
            title: values.map((value) => String(value)).join(', ')
        });
    }
    if (field.unit) {
        tags.push({ text: `unit ${field.unit}` });
    }
    if (field.default !== undefined && field.default !== null && field.default !== '' && typeof field.default !== 'object') {
        tags.push({ text: `default ${field.default}` });
    }
    return tags;
}
