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
