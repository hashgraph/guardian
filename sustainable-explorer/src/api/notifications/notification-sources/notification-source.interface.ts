import type { DataSource } from 'typeorm';

/**
 * Per-project display data resolved ONCE per scan batch (business_view +
 * registry name via a LATERAL join + businessData.methodology) and handed to
 * every NotificationSource's buildPayload(). Sources never resolve
 * project/registry/methodology themselves — this is what keeps the "no
 * per-notification joins" guarantee true no matter how many sources exist.
 */
export interface ProjectEnrichment {
    /**
     * business_view.sourceTimestamp — the frontend's app-wide project
     * identifier (WatchlistItem.id, used in project URLs). This is the value
     * written to notifications.projectKey and matched against
     * watchlist_subscriptions.projectKey — NOT business_view.id, which is an
     * internal bigint PK the frontend never sees.
     */
    sourceTimestamp: string;
    displayName: string | null;
    relatedTopicId: string | null;
    registryName: string | null;
    methodology: string | null;
}

/**
 * One notification category (issuance today; retirement/transfer are
 * intentionally not implemented yet — see NotificationScanService).
 *
 * NotificationScanService.scanSource() drives every source through the same
 * leader-elected tick / drain-loop / batch-insert / publish pipeline; a
 * source only ever describes what varies per category (its own event query,
 * watermark, dedupe key, and payload shape).
 *
 * To add a new category later:
 *   1. Create `{category}.source.ts` implementing this interface.
 *   2. Add it to `ENABLED_SOURCES` in notification-scan.service.ts.
 * Nothing else changes — the notifications table, read API
 * (NotificationsController/Service/Repository), and frontend already treat
 * `type`/`payload` as opaque, and the shared business_view + registry +
 * methodology enrichment step is generic across every source.
 */
export interface NotificationSource<TRow> {
    /** Written to notifications.type; also used as the SSE nudge's `type` and the i18n description key. */
    readonly type: string;
    /** notification_watermarks.source — must be unique per source. */
    readonly watermarkSource: string;

    /** One batched query against the network DB for events strictly after `since`, oldest first, capped at `limit`. */
    fetchBatch(netDs: DataSource, since: string, limit: number): Promise<TRow[]>;
    /** The new watermark value to persist after processing one full batch. */
    nextWatermark(batch: TRow[]): string;
    /** Unique-per-event key backing the (userId, dedupeKey) idempotency constraint. */
    dedupeKey(row: TRow): string;
    /** business_view.projectKey this row belongs to — the join key into the shared enrichment lookup. */
    projectKeyOf(row: TRow): string;
    /** The notification payload (opaque jsonb) for this row, given its resolved project enrichment (undefined if the project_key had no matching business_view row). */
    buildPayload(row: TRow, enrich: ProjectEnrichment | undefined): Record<string, unknown>;
}
