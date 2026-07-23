import { SystemDataSource } from '@api/database/system-database.module';

/**
 * Report-ID generator for the Impact Summary PDF. Format: `SA-RPT-{yyyy}-{mmdd}-{seq}` (e.g.
 * `SA-RPT-2026-0703-001`), where `seq` is a per-day, per-network sequence derived by counting today's
 * already-logged `audit_log` rows for `action='export.impact_summary'` (no dedicated export-history table
 * exists). The count runs before the current generation's own audit_log row is written, so
 * `seq = count-so-far + 1`. This is a best-effort, non-atomic sequence (a plain COUNT, not a DB sequence object)
 * — two concurrent generations on the same day/network could compute the same `seq`, an acceptable tradeoff for
 * a human-readable label, not a uniqueness-critical key.
 */

const REPORT_ID_PREFIX = 'SA-RPT';

/** `audit_log.action` value written for every Impact Summary generation. */
export const IMPACT_SUMMARY_EXPORT_ACTION = 'export.impact_summary';

/**
 * Pure formatter — `SA-RPT-{yyyy}-{mmdd}-{seq}`. Uses `date`'s UTC calendar fields (stable regardless of
 * server/DB timezone); `seq` is zero-padded to 3 digits, widening rather than wrapping past 999. No I/O, no
 * `Date.now()` default — callers own "now" so this stays trivially unit-testable.
 */
export function formatReportId(date: Date, seq: number): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const seqStr = String(Math.max(1, Math.trunc(seq))).padStart(3, '0');
    return `${REPORT_ID_PREFIX}-${yyyy}-${mm}${dd}-${seqStr}`;
}

/** [start, end) UTC-midnight bounds for the calendar day containing `date`. */
function utcDayBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
}

interface CountRow {
    count: string; // bigint arrives as a string from pg
}

/** Thin async helper: counts today's (UTC) `audit_log` rows for `action='export.impact_summary'` scoped to `network`, via the system DataSource; read-only, fully parameterized, no new table. */
export async function countTodaysImpactSummaryExports(
    systemDataSource: SystemDataSource,
    network: string,
    now: Date = new Date(),
): Promise<number> {
    const { start, end } = utcDayBounds(now);
    const ds = systemDataSource.getDataSource();
    const rows: CountRow[] = await ds.query(
        `SELECT COUNT(*)::bigint AS count
         FROM audit_log
         WHERE action = $1
           AND network = $2
           AND "createdAt" >= $3
           AND "createdAt" < $4`,
        [IMPACT_SUMMARY_EXPORT_ACTION, network, start, end],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
}

/** Generates the next report ID for a fresh Impact Summary generation on `network` at `now`, composing the pure formatter with the async count helper above — the only function most callers need. */
export async function generateReportId(
    systemDataSource: SystemDataSource,
    network: string,
    now: Date = new Date(),
): Promise<string> {
    const priorCount = await countTodaysImpactSummaryExports(systemDataSource, network, now);
    return formatReportId(now, priorCount + 1);
}
