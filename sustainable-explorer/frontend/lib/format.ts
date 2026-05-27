export function formatCredits(value: number): string {
    return value.toLocaleString();
}

export function formatNumber(value: number): string {
    return value.toLocaleString();
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
