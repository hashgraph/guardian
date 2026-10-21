import { IFormulaSource } from '@guardian/interfaces';

/**
 * Formula item types as the UI shows them: the name and the icon in /assets/images/icons.
 */
export const FORMULA_TYPES: { id: string, text: string, icon: string }[] = [
    { id: 'constant', text: 'Constant', icon: 'const' },
    { id: 'variable', text: 'Variable', icon: 'variable' },
    { id: 'formula', text: 'Formula', icon: 'function' },
    { id: 'text', text: 'Text', icon: 'text' }
];

const TYPES_BY_ID = new Map(FORMULA_TYPES.map((t) => [t.id, t]));

export function formulaTypeName(type: string | null | undefined): string {
    return TYPES_BY_ID.get(type || '')?.text || type || '';
}

export function formulaTypeIcon(type: string | null | undefined): string {
    return TYPES_BY_ID.get(type || '')?.icon || 'function';
}

/**
 * The fields of a formula's source, in display order.
 */
export const SOURCE_FIELDS: { key: keyof IFormulaSource, label: string }[] = [
    { key: 'methodology', label: 'Methodology' },
    { key: 'section', label: 'Section' },
    { key: 'equation', label: 'Equation' },
    { key: 'page', label: 'Page' }
];

/**
 * The non-empty source fields, trimmed, in display order.
 */
export function sourceRows(source?: IFormulaSource | null): { label: string, value: string }[] {
    if (!source || typeof source !== 'object') {
        return [];
    }
    const rows: { label: string, value: string }[] = [];
    for (const { key, label } of SOURCE_FIELDS) {
        const raw = source[key];
        if (raw === undefined || raw === null) {
            continue;
        }
        const value = String(raw).trim();
        if (value) {
            rows.push({ label, value });
        }
    }
    return rows;
}
