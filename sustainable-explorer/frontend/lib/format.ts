export function formatCredits(value: number): string {
    return value.toLocaleString();
}

/**
 * Smart credit total formatter.
 * < 100 000  → "1,667"   (comma-separated, no unit suffix)
 * ≥ 100 000  → "0.2M"    (rounded to 1 decimal in millions)
 */
export function formatSmartCredits(raw: number): string {
    if (raw < 100_000) return Math.round(raw).toLocaleString();
    return `${Math.round(raw / 100_000) / 10}M`;
}

export function formatNumber(value: number): string {
    return value.toLocaleString();
}

/** Truncates by character count, appending "..." when the text exceeds maxLength. */
export function truncateText(text: string | null | undefined, maxLength: number): string {
    if (!text) return text ?? '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

/**
 * Guardian transaction type strings often carry a "&<version>" suffix
 * (e.g. "MintToken&1.0.0"). Strip it for display.
 */
export function formatTransactionType(value: string | null | undefined): string {
    if (!value) return '—';
    const primary = value.split('&')[0].trim();
    return primary || '—';
}

export function formatDate(value: string | number | null | undefined): string {
    if (!value) return '—';
    const s = String(value).trim();
    if (/^\d{4}$/.test(s)) return s;
    let date: Date;
    if (/^\d+(\.\d+)?$/.test(s)) {
        const num = parseFloat(s);
        date = new Date(num < 1e12 ? num * 1000 : num);
    } else {
        date = new Date(s);
    }
    if (isNaN(date.getTime())) return s;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
