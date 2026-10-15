import { IFormulaSource } from '@guardian/interfaces';
import { FormulaItem } from '../../models/formula-tree';

export type FormulasViewOrigin = 'form' | 'document';

/**
 * Keeps only the clicked item as a root.
 * Falls back to all items if itemId is not set or not found.
 */
export function filterRootItems(items: FormulaItem[], itemId?: string | null): FormulaItem[] {
    if (!itemId) {
        return items;
    }
    const filtered = items.filter((e) => e.uuid === itemId);
    return filtered.length ? filtered : items;
}

/**
 * Returns the source rows that have a non-empty value, in display order.
 */
export function sourceRows(source?: IFormulaSource | null): { label: string, value: string }[] {
    if (!source || typeof source !== 'object') {
        return [];
    }
    const fields: [string, unknown][] = [
        ['Methodology', source.methodology],
        ['Section', source.section],
        ['Equation', source.equation],
        ['Page', source.page]
    ];
    const rows: { label: string, value: string }[] = [];
    for (const [label, raw] of fields) {
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
