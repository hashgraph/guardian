/**
 * Compact relative-time formatter: "just now", "5s ago", "3m ago", "2h ago",
 * "4d ago", "3 months ago", "2 years ago". Auto-imported (composables/).
 */
export function timeAgo(input: string | Date | null | undefined): string {
    if (!input) return '—';
    const date = typeof input === 'string' ? new Date(input) : input;
    const ms = date.getTime();
    if (Number.isNaN(ms)) return '—';

    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 0) return 'just now';
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;

    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}
