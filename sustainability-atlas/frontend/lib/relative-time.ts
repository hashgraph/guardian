export type Translate = (key: string, params?: Record<string, unknown>) => string;

/**
 * Formats a date string as a relative time ("3 minutes ago", "2 days ago"),
 * falling back to a short absolute date past 30 days. `t` is the caller's
 * i18n translate function — kept as a parameter rather than importing
 * useI18n() here so this stays a plain, testable function.
 */
export function relativeTime(dateStr: string, t: Translate): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return dateStr;
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return t('dashboard.activity.justNow');
    if (diffMin < 60) return diffMin === 1
        ? t('dashboard.activity.minuteAgo', { n: diffMin })
        : t('dashboard.activity.minutesAgo', { n: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr === 1
        ? t('dashboard.activity.hourAgo', { n: diffHr })
        : t('dashboard.activity.hoursAgo', { n: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return diffDay === 1
        ? t('dashboard.activity.dayAgo', { n: diffDay })
        : t('dashboard.activity.daysAgo', { n: diffDay });
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
