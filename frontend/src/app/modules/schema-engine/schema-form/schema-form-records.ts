/**
 * Title and subtitle of a record card: the first scalar values of the row.
 * Shared by the edit form and the read-only view, so a row reads the same in both.
 */
export function recordSummary(values: unknown[], fallbackTitle: string): { title: string; sub: string } {
    const scalars: string[] = [];
    for (const value of values) {
        if (value === null || value === undefined || value === '' || typeof value === 'object') {
            continue;
        }
        scalars.push(String(value));
        if (scalars.length === 4) {
            break;
        }
    }
    if (!scalars.length) {
        return { title: fallbackTitle, sub: '' };
    }
    return { title: scalars[0], sub: scalars.slice(1).join(' · ') };
}
