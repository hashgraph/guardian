import { formatDate } from '~/lib/format';

/**
 * A methodology version's lifecycle, as derived by the API from the newest
 * discontinue message Guardian published for it (`lifecycleStatus`).
 *
 * "to_be_discontinued" is still live today but has an end date on the ledger;
 * "discontinued" is one whose effective date has passed.
 */
export type MethodologyStatus = 'published' | 'to_be_discontinued' | 'discontinued';

export const METHODOLOGY_STATUSES: MethodologyStatus[] = ['published', 'to_be_discontinued', 'discontinued'];

interface WithLifecycle {
    lifecycleStatus?: string | null;
    discontinuedAt?: string | null;
}

/** The row's lifecycle status, falling back to "published" for anything unrecognised. */
export function methodologyStatus(m: WithLifecycle): MethodologyStatus {
    return (METHODOLOGY_STATUSES as string[]).includes(m.lifecycleStatus ?? '')
        ? (m.lifecycleStatus as MethodologyStatus)
        : 'published';
}

/** Badge colours: live is green, scheduled-to-end is amber, ended is muted. */
export function methodologyStatusBadgeClass(status: MethodologyStatus): string {
    if (status === 'discontinued') return 'bg-muted text-muted-foreground';
    // Still live, but with an end date already on the ledger.
    if (status === 'to_be_discontinued') return 'bg-stat-amber/10 text-stat-amber';
    return 'bg-stat-green/10 text-stat-green';
}

/** Tooltip for the status badge: when the discontinuation takes, or took, effect. */
export function methodologyStatusTooltip(
    m: WithLifecycle,
    t: (key: string, params: Record<string, unknown>) => string,
): string | undefined {
    if (!m.discontinuedAt) return undefined;
    const status = methodologyStatus(m);
    if (status === 'published') return undefined;
    const key = status === 'discontinued'
        ? 'methodologies.statusTooltips.discontinuedOn'
        : 'methodologies.statusTooltips.discontinuesOn';
    return t(key, { date: formatDate(m.discontinuedAt) });
}
