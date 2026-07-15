import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { NetworkDataSourceRegistry } from '@api/database/network-datasource.registry';
import { SystemDataSource, returningRows } from '@api/database/system-database.module';
import { RedisService } from '@shared/redis/redis.service';
import { getRedictConfig } from '@shared/config/redict.config';
import { getConfiguredNetworks } from '@shared/config/database.config';
import type { NotificationSource, ProjectEnrichment } from './notification-sources/notification-source.interface';
import { issuanceSource } from './notification-sources/issuance.source';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface WatermarkRow {
    lastValue: string | null;
}

interface BusinessViewRow {
    id: string;
    projectKey: string;
    displayName: string | null;
    relatedTopicId: string | null;
    registryName: string | null;
    methodology: string | null;
}

interface WatcherRow {
    userId: string;
    projectKey: string;
}

interface NotificationTuple {
    userId: string;
    bvId: string;
    dedupeKey: string;
    payload: Record<string, unknown>;
}

const SE_NOTIF_CHANNEL = 'se:notifications';
const SCAN_BATCH_LIMIT = 500;
const LEADER_TTL_S = 30;
const LEADER_RENEW_MS = 15_000;

/**
 * Registered notification sources — issuance today. Retirement/transfer are
 * intentionally NOT implemented yet (no scanning happens for them); adding
 * either later is "write one `{category}.source.ts` implementing
 * NotificationSource, add it here" — see notification-source.interface.ts
 * for the full contract and rationale.
 */
const ENABLED_SOURCES: readonly NotificationSource<any>[] = [issuanceSource];

/**
 * API-side (no worker involvement) notification-source scan engine.
 *
 * A plain `@Injectable() OnModuleInit`, NOT a BullMQ processor — the API
 * process doesn't run BullMQ job consumers today, so a `setInterval` per
 * configured network (leader-elected via Redict, same pattern as the worker's
 * SyncSchedulerService) is the smaller, already-proven primitive to reuse.
 *
 * Per tick (only on the elected leader for that network), every entry in
 * ENABLED_SOURCES is scanned in turn (one Redis leader-lock per network, not
 * per network×source — at this app's scale a handful of batched queries per
 * tick is not a bottleneck, and sequential sources keep the leader-lock
 * bookkeeping exactly as simple as it was with a single source). Each
 * source's failure is isolated so one broken source never blocks another.
 *
 * scanSource() does, per source, per drain iteration:
 *   1. Read the source's watermark from notification_watermarks (network DB).
 *   2. Batch-read events past that watermark via source.fetchBatch (network DB).
 *   3. Resolve the batch's distinct project_keys to business_view rows,
 *      enriched with the registry's display name (LATERAL join on
 *      business_view WHERE viewType='REGISTRY') and businessData.methodology
 *      — one batched query, shared by every source, never per-notification.
 *   4. Resolve watchers for those business_view.id values via
 *      watchlist_subscriptions (system DB) — watchlist_subscriptions.projectKey
 *      stores business_view.id (= WatchlistItem.id), NOT the source row's own
 *      project_key, so the join key here is business_view.id.
 *   5. Insert one multi-row batch into `notifications` (system DB) with
 *      ON CONFLICT ("userId","dedupeKey") DO NOTHING.
 *   6. Advance the watermark to the batch's max cursor value (network DB) —
 *      always, even when no watchers matched, so events are never re-scanned.
 *   7. For every distinct userId that received a newly-inserted row, publish a
 *      best-effort "go re-fetch" nudge over Redis pub/sub and invalidate the
 *      unread-count cache. Never load-bearing for correctness — the
 *      `notifications` row is the source of truth.
 *   8. If the batch was exactly SCAN_BATCH_LIMIT rows, loop immediately from
 *      the new watermark (drain a large backlog within one tick).
 */
@Injectable()
export class NotificationScanService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NotificationScanService.name);
    private readonly instanceId = `api-${process.pid}-${Date.now()}`;
    private readonly networks = getConfiguredNetworks();
    private readonly intervalMs: number;

    /** Dedicated ioredis client (keyPrefix stripped) for the leader lock + publish. */
    private redisClient!: Redis;

    private readonly tickTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly leaderRenewTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly isLeader = new Map<string, boolean>();
    private readonly running = new Map<string, boolean>();

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly systemDataSource: SystemDataSource,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) {
        this.intervalMs = (this.configService.get<number>('app.notifScanInterval') ?? 20) * 1000;
    }

    private leaderKey(network: string): string {
        return `se:notif-scan:leader:${network}`;
    }

    async onModuleInit(): Promise<void> {
        // Subscriber/publisher channels are NOT prefixed by ioredis automatically
        // (same reasoning as QueueEventsBus's dedicated subscriber) — strip
        // keyPrefix so leader-lock keys and the publish channel use raw names.
        const { keyPrefix: _keyPrefix, ...connectionOpts } = getRedictConfig();
        this.redisClient = new Redis({ ...connectionOpts, lazyConnect: false });
        this.redisClient.on('error', (error: Error) => {
            this.logger.warn(`Redis client error: ${error.message}`);
        });

        for (const network of this.networks) {
            try {
                await this.startForNetwork(network);
            } catch (error: unknown) {
                // One network's failure must not block the others.
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to start notification scan for "${network}": ${message}`);
            }
        }
    }

    onModuleDestroy(): void {
        for (const timer of this.tickTimers.values()) clearInterval(timer);
        for (const timer of this.leaderRenewTimers.values()) clearInterval(timer);
        this.tickTimers.clear();
        this.leaderRenewTimers.clear();

        for (const [network, held] of this.isLeader.entries()) {
            if (held) {
                this.redisClient.del(this.leaderKey(network)).catch(() => {
                    // Best-effort release — TTL will expire it regardless.
                });
            }
        }

        try {
            this.redisClient.disconnect();
        } catch {
            // ignore
        }
    }

    // ---------------------------------------------------------------------------
    // Per-network startup
    // ---------------------------------------------------------------------------

    private async startForNetwork(network: string): Promise<void> {
        this.isLeader.set(network, await this.tryAcquireLeader(network));

        const tickTimer = setInterval(() => {
            this.tick(network).catch(() => {
                // tick() already logs internally; swallow here to keep the
                // interval alive.
            });
        }, this.intervalMs);
        this.tickTimers.set(network, tickTimer);

        const renewTimer = setInterval(() => {
            void (async () => {
                try {
                    const leader = await this.tryAcquireLeader(network);
                    this.isLeader.set(network, leader);
                    if (leader) {
                        await this.redisClient.expire(this.leaderKey(network), LEADER_TTL_S);
                    }
                } catch {
                    // Silent — retried next interval.
                }
            })();
        }, LEADER_RENEW_MS);
        this.leaderRenewTimers.set(network, renewTimer);

        this.logger.log(
            `Notification scan started for "${network}" (leader=${this.isLeader.get(network)}, intervalMs=${this.intervalMs})`,
        );
    }

    /**
     * Distributed lock for scan leadership, scoped per network. Exact copy of
     * SyncSchedulerService.tryAcquireLeader's SET-NX-EX + GET-compare fallback,
     * with a different key namespace (`se:notif-scan:leader:*`) so it never
     * collides with the worker's own scheduler lock.
     */
    private async tryAcquireLeader(network: string): Promise<boolean> {
        const result = await this.redisClient.set(
            this.leaderKey(network),
            this.instanceId,
            'EX', LEADER_TTL_S,
            'NX',
        );
        if (result === 'OK') return true;

        const current = await this.redisClient.get(this.leaderKey(network));
        return current === this.instanceId;
    }

    // ---------------------------------------------------------------------------
    // Tick
    // ---------------------------------------------------------------------------

    private async tick(network: string): Promise<void> {
        if (!this.isLeader.get(network)) return;
        if (this.running.get(network)) return;

        this.running.set(network, true);
        try {
            for (const source of ENABLED_SOURCES) {
                try {
                    await this.scanSource(network, source);
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.logger.error(`scanSource(${source.type}) failed for "${network}": ${message}`);
                }
            }
        } finally {
            this.running.set(network, false);
        }
    }

    // ---------------------------------------------------------------------------
    // Generic source scan
    // ---------------------------------------------------------------------------

    async scanSource<TRow>(network: string, source: NotificationSource<TRow>): Promise<void> {
        const netDs = this.dataSources.getDataSource(network);
        const sysDs = this.systemDataSource.getDataSource();

        // Drain loop: keep scanning while the batch is exactly at the limit.
        for (;;) {
            const wmRows: WatermarkRow[] = await netDs.query(
                `SELECT "lastValue" FROM notification_watermarks WHERE source = $1`,
                [source.watermarkSource],
            );
            const since = wmRows[0]?.lastValue ?? '0';

            const batch = await source.fetchBatch(netDs, since, SCAN_BATCH_LIMIT);

            if (batch.length === 0) {
                return;
            }

            const projectKeys = [...new Set(batch.map((row) => source.projectKeyOf(row)))];

            const bvRows: BusinessViewRow[] = projectKeys.length > 0
                ? await netDs.query(
                    `SELECT bv.id, bv."projectKey", bv."displayName", bv."relatedTopicId",
                            bv."businessData"->>'methodology' AS "methodology",
                            reg.registry_name AS "registryName"
                       FROM business_view bv
                       LEFT JOIN LATERAL (
                           SELECT "displayName" AS registry_name
                             FROM business_view
                            WHERE "viewType" = 'REGISTRY' AND "registryDid" = bv."registryDid"
                            ORDER BY "createdAt" DESC NULLS LAST
                            LIMIT 1
                       ) reg ON true
                      WHERE bv."viewType" = 'PROJECT' AND bv."projectKey" = ANY($1::text[])`,
                    [projectKeys],
                )
                : [];

            const bvByProjectKey = new Map<string, BusinessViewRow>(
                bvRows.map((r) => [r.projectKey, r]),
            );

            const bvIds = [...new Set(bvRows.map((r) => r.id))];

            const watchersByBvId = new Map<string, string[]>();
            if (bvIds.length > 0) {
                const watcherRows: WatcherRow[] = await sysDs.query(
                    `SELECT "userId", "projectKey"
                       FROM watchlist_subscriptions
                      WHERE network = $1 AND "projectKey" = ANY($2::text[])`,
                    [network, bvIds],
                );
                for (const row of watcherRows) {
                    const list = watchersByBvId.get(row.projectKey) ?? [];
                    list.push(row.userId);
                    watchersByBvId.set(row.projectKey, list);
                }
            }

            const tuples: NotificationTuple[] = [];
            for (const row of batch) {
                const bv = bvByProjectKey.get(source.projectKeyOf(row));
                if (!bv) continue;
                const watchers = watchersByBvId.get(bv.id);
                if (!watchers || watchers.length === 0) continue;

                const enrich: ProjectEnrichment = {
                    bvId: bv.id,
                    displayName: bv.displayName,
                    relatedTopicId: bv.relatedTopicId,
                    registryName: bv.registryName,
                    methodology: bv.methodology,
                };
                const dedupeKey = source.dedupeKey(row);
                const payload = source.buildPayload(row, enrich);

                for (const userId of watchers) {
                    tuples.push({ userId, bvId: bv.id, dedupeKey, payload });
                }
            }

            let insertedUserIds: string[] = [];
            if (tuples.length > 0) {
                const userIds = tuples.map((t) => t.userId);
                const networksArr = tuples.map(() => network);
                const typesArr = tuples.map(() => source.type);
                const projectKeysArr = tuples.map((t) => t.bvId);
                const payloadsArr = tuples.map((t) => JSON.stringify(t.payload));
                const dedupeKeysArr = tuples.map((t) => t.dedupeKey);

                const insertResult = await sysDs.query(
                    `INSERT INTO notifications ("userId", network, type, "projectKey", payload, "dedupeKey")
                     SELECT * FROM unnest(
                         $1::uuid[], $2::varchar[], $3::varchar[], $4::varchar[], $5::jsonb[], $6::varchar[]
                     )
                     ON CONFLICT ("userId", "dedupeKey") DO NOTHING
                     RETURNING "userId"`,
                    [userIds, networksArr, typesArr, projectKeysArr, payloadsArr, dedupeKeysArr],
                );
                insertedUserIds = returningRows<{ userId: string }>(insertResult).map((r) => r.userId);
            }

            // Advance the watermark to the batch's max cursor value — always,
            // even when no watchers matched, so these events are never re-scanned.
            const newWatermark = source.nextWatermark(batch);
            await netDs.query(
                `INSERT INTO notification_watermarks (source, "lastValue")
                 VALUES ($1, $2)
                 ON CONFLICT (source) DO UPDATE SET "lastValue" = EXCLUDED."lastValue", "updatedAt" = now()`,
                [source.watermarkSource, newWatermark],
            );

            const distinctUserIds = [...new Set(insertedUserIds)];
            for (const userId of distinctUserIds) {
                try {
                    await this.redisClient.publish(
                        SE_NOTIF_CHANNEL,
                        JSON.stringify({ userId, network, type: source.type }),
                    );
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.logger.warn(`Failed to publish notification event for user ${userId}: ${message}`);
                }
                await this.redisService.del(`notif-count:${userId}:${network}`);
            }

            if (batch.length < SCAN_BATCH_LIMIT) {
                return;
            }
            // Exactly at the cap — loop again from the new watermark to drain
            // a large backlog within this same tick.
        }
    }
}
