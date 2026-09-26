import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES, envInt, getTopicPollMode, getWorkerNetwork } from '@shared/config/bullmq.config';
import { LeaderLock } from '@shared/redis/leader-lock';
import { canEnqueueBulk } from '@shared/redis/redis-headroom';
import { ROOT_TOPICS } from '@shared/config/configuration';
import { PolicyDecodeJobData } from '../processors/policy-decode.processor';
import { TREASURY_TRANSFERS_JOB } from '../processors/token-sync.processor';
import { BUSINESS_VIEW_PARTITIONS } from '../processors/business-view-builder.processor';
import { DISCONTINUE_ACTIONS } from '@shared/utils/message-parser';
import { ProjectMapperService } from '../services/project-mapper.service';

/** Shape accepted by Queue.addBulk. */
type BulkJob = Parameters<Queue['addBulk']>[0][number];

/**
 * Orchestrates initial sync jobs on startup.
 * Uses Redict-based leader election (scoped per network) so only one instance
 * per network seeds jobs and schedules repeatables when running multiple
 * workers horizontally.
 */
@Injectable()
export class SyncSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SyncSchedulerService.name);
    private readonly instanceId = `worker-${process.pid}-${Date.now()}`;
    private readonly network = getWorkerNetwork();
    private readonly leaderKey = `se:scheduler:leader:${this.network}`;
    private leaderInterval: ReturnType<typeof setInterval> | null = null;
    private isLeader = false;
    /** Boot seeding is one-shot per process, even across a leadership takeover. */
    private seedingRan = false;
    /** Jobs per addBulk pipeline — see addBulkChunked. */
    private static readonly BULK_CHUNK = 500;
    private leaderLock!: LeaderLock;

    /** Liveness reconciler — see runReconcile(). */
    private reconcileInterval: ReturnType<typeof setInterval> | null = null;
    private reconcileRunning = false;
    private readonly reconcileEveryMs = envInt('RECONCILE_INTERVAL_MS', 300_000);
    private readonly reconcileTopicLimit = envInt('RECONCILE_TOPIC_LIMIT', 2000);
    private readonly reconcileMessageLimit = envInt('RECONCILE_MESSAGE_LIMIT', 1000);
    private readonly stuckMessageAfterMs = envInt('RECONCILE_STUCK_MESSAGE_MS', 3_600_000);
    private readonly reconcileDiscontinueReparseLimit = envInt('RECONCILE_DISCONTINUE_REPARSE_LIMIT', 200);
    

    /** Topic poll dispatcher — see runDispatcher(). */
    private dispatchInterval: ReturnType<typeof setInterval> | null = null;
    private dispatchRunning = false;
    private readonly pollMode = getTopicPollMode();
    private readonly dispatchEveryMs = envInt('TOPIC_DISPATCH_INTERVAL_MS', 5_000);
    private readonly dispatchBatch = envInt('TOPIC_DISPATCH_BATCH', 500);

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly projectMapperService: ProjectMapperService,
        @Inject('REDICT_PUB') private readonly redis: Redis,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC_PRIORITY) private readonly topicPriorityQueue: Queue,
        @InjectQueue(QUEUE_NAMES.MESSAGE_PARSE) private readonly messageQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
        @InjectQueue(QUEUE_NAMES.RETIRE_SYNC) private readonly retireQueue: Queue,
        @InjectQueue(QUEUE_NAMES.MV_REFRESH) private readonly mvRefreshQueue: Queue,
        @InjectQueue(QUEUE_NAMES.BUSINESS_VIEW_BUILD) private readonly businessViewQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_DECODE) private readonly policyDecodeQueue: Queue,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_STATUS) private readonly policyStatusQueue: Queue,
    ) {
        this.leaderLock = new LeaderLock(this.redis, this.leaderKey, this.instanceId, 30);
    }

    async onModuleInit(): Promise<void> {
        this.logger.log(`Scheduler starting (instance: ${this.instanceId})`);

        this.isLeader = await this.leaderLock.tryAcquire();

        if (this.isLeader) {
            this.logger.log('Acquired scheduler leadership — seeding sync jobs');
            // Deliberately not awaited. Seeding walks six-figure tables and
            // enqueues in bulk; awaiting it here would hold up onModuleInit and
            // keep every processor from starting to drain until it finished.
            void this.runBootSeeding();
        } else {
            this.logger.log('Another instance is leader — skipping boot seeding');
        }

        // Renew leadership periodically. renew() is a compare-and-swap, so a
        // false result means another instance now owns the lock.
        this.leaderInterval = setInterval(async () => {
            try {
                if (this.isLeader) {
                    this.isLeader = await this.leaderLock.renew();
                    if (!this.isLeader) {
                        this.logger.warn('Lost scheduler leadership');
                    }
                    return;
                }
                // Standby: take over once the previous leader's TTL lapses.
                if (await this.leaderLock.tryAcquire()) {
                    this.isLeader = true;
                    // runBootSeeding is one-shot per process, so on an instance
                    // that already seeded this only resumes leader-gated timers.
                    this.logger.log(
                        this.seedingRan
                            ? 'Took over scheduler leadership'
                            : 'Took over scheduler leadership — seeding sync jobs',
                    );
                    void this.runBootSeeding();
                }
            } catch {
                // Silent — will retry next interval
            }
        }, 15000);

        // Leader-gated inside the tick so a takeover starts reconciling without
        // a restart.
        if (this.reconcileEveryMs > 0) {
            this.reconcileInterval = setInterval(() => {
                void this.runReconcile();
            }, this.reconcileEveryMs);
            this.logger.log(`Liveness reconciler enabled (every ${this.reconcileEveryMs}ms)`);
        }

        // Deliberately a timer rather than a repeatable BullMQ job: the whole
        // point of the dispatcher is to stop the queue carrying one job per
        // topic, and creating a job every 5s to achieve that would put back a
        // slice of what it removes. Leader-gated inside the tick, like the
        // reconciler, so a takeover starts dispatching without a restart.
        if (this.pollMode === 'dispatcher' && this.dispatchEveryMs > 0) {
            this.dispatchInterval = setInterval(() => {
                void this.runDispatcher();
            }, this.dispatchEveryMs);
            this.logger.log(
                `Topic poll dispatcher enabled (every ${this.dispatchEveryMs}ms, ` +
                `up to ${this.dispatchBatch} topics per tick)`,
            );
        } else {
            this.logger.log('Topic poll mode: chain (self-enqueueing poll jobs)');
        }
    }

    onModuleDestroy(): void {
        if (this.leaderInterval) {
            clearInterval(this.leaderInterval);
            this.leaderInterval = null;
        }
        if (this.reconcileInterval) {
            clearInterval(this.reconcileInterval);
            this.reconcileInterval = null;
        }
        if (this.dispatchInterval) {
            clearInterval(this.dispatchInterval);
            this.dispatchInterval = null;
        }
        // Compare-and-swap release: never frees a lock another instance has
        // since taken over.
        if (this.isLeader) {
            this.leaderLock.release().catch(() => {});
        }
    }

    /**
     * Enqueues in bulk, in chunks.
     *
     * Seeding walks six-figure tables, and issuing one `add()` per row meant
     * tens of thousands of sequential round-trips against a half-a-core Redict
     * on every boot. addBulk pipelines a chunk into a single round-trip; the
     * chunk cap keeps one pipeline from getting large enough to stall the event
     * loop or spike Redict's memory while it buffers the reply.
     */
    private async addBulkChunked(queue: Queue, jobs: BulkJob[]): Promise<number> {
        for (let i = 0; i < jobs.length; i += SyncSchedulerService.BULK_CHUNK) {
            await queue.addBulk(jobs.slice(i, i + SyncSchedulerService.BULK_CHUNK));
        }
        return jobs.length;
    }

    /**
     * One-shot boot seeding. Leader-only: every step here is a full-table sweep
     * that enqueues one job per row, and running it on every replica multiplied
     * tens of thousands of Redis round-trips by the replica count for no extra
     * coverage — the enqueued jobs are identical. Anything a dying leader misses
     * is picked up by the reconciler or by the next leader's seeding pass.
     */
    private async runBootSeeding(): Promise<void> {
        if (this.seedingRan) return;
        this.seedingRan = true;
        try {
            await this.scheduleAllJobs();

            // Idempotent upsert — resets hasNext to true so a restart resumes
            // crawling even if the topic was previously exhausted.
            await this.seedRootTopic();

            await this.scheduleTopicSyncs();
            await this.scheduleTokenSyncs();
            await this.scheduleRetireSyncs();
            await this.schedulePolicyDecodeJobs();
            await this.rescheduleOrphanedTopics();

            // Backfill IPFS fetches for VCs whose parent policy is now decoded but
            // whose fetch was skipped (they arrived before their policy was decoded).
            await this.backfillSuccessfulPolicyVcFetches();

            // Backfill IPFS fetches for Standard Registry profile-topic VCs. These
            // carry OrganizationName, the fallback display-name source for the 50+
            // registries that don't publish a name inline on their announcement.
            await this.backfillRegistryProfileVcFetches();

            // Re-run eager project mapping for already-fetched VCs.
            // Opt-in via BACKFILL_PROJECTS_ON_BOOT=true. Used when the mapper logic
            // changed and existing PROJECT rows need to be regenerated from scratch.
            // The backfill DELETEs all PROJECT rows before replaying, so credits
            // don't double-count. After it produces rows, unset the env var on the
            // next restart to skip the O(n) replay cost.
            if (process.env.BACKFILL_PROJECTS_ON_BOOT === 'true') {
                this.logger.log('BACKFILL_PROJECTS_ON_BOOT=true — replaying VCs through project mapper');
                await this.backfillProjectMappings();
            }

            this.logger.log('Boot seeding complete');
        } catch (error) {
            // Never rethrow: this runs detached, so an unhandled rejection here
            // would take down the worker process.
            this.logger.error(`Boot seeding failed: ${(error as Error).message}`);
        }
    }

    // -------------------------------------------------------------------------
    // Liveness reconciler
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // Topic poll dispatcher (TOPIC_POLL_MODE=dispatcher)
    // -------------------------------------------------------------------------

    /**
     * Hands out the topics that are due to be polled right now.
     *
     * In `chain` mode every known topic parks a delayed BullMQ job so that it can
     * re-poll itself, which means ~100k idle testnet topics cost ~100k resident
     * jobs and a steady stream of re-creations — load proportional to how many
     * topics EXIST rather than how many have anything to say. Here the schedule
     * lives in topic_cache and the queue only ever holds the due set.
     *
     * `FOR UPDATE SKIP LOCKED` makes the claim safe without a lock of its own:
     * two dispatchers running concurrently (a leadership handover, an operator
     * running a second worker) each take disjoint rows rather than duplicating
     * work or blocking each other.
     */
    private async runDispatcher(): Promise<void> {
        if (!this.isLeader || this.dispatchRunning) return;
        this.dispatchRunning = true;
        try {
            // Claim and re-arm in one statement: the row's next poll is scheduled
            // before its job is enqueued, so a crash between the two costs one
            // skipped poll rather than a topic that stops being scheduled at all.
            const due: Array<{ topicId: string; messages: number; wasPriority: number }> =
                await this.dataSource.query(
                    `WITH due AS (
                         SELECT "topicId", "pollPriority"
                           FROM topic_cache
                          WHERE status <> 'DISABLED'
                            AND "nextPollAt" IS NOT NULL
                            AND "nextPollAt" <= now()
                          ORDER BY "pollPriority" DESC, "nextPollAt"
                          LIMIT $1
                            FOR UPDATE SKIP LOCKED
                     )
                     UPDATE topic_cache t
                        SET "nextPollAt"   = now() + (t."pollIntervalSec" * interval '1 second'),
                            "pollPriority" = 0
                       FROM due
                      WHERE t."topicId" = due."topicId"
                  RETURNING t."topicId", t.messages, due."pollPriority" AS "wasPriority"`,
                    [this.dispatchBatch],
                );

            if (due.length === 0) return;

            // A topic flagged by a Guardian event goes to the priority lane; the
            // rest are routine re-polls.
            const priority: BulkJob[] = [];
            const bulk: BulkJob[] = [];
            for (const row of due) {
                const job: BulkJob = {
                    name: 'sync',
                    data: {
                        topicId: row.topicId,
                        fromSequenceNumber: row.messages ?? 0,
                        isOrgTopic: Number(row.wasPriority) > 0,
                        emptyPollStreak: 0,
                    },
                    opts: {
                        // Distinct per dispatch so a re-add can never collide with
                        // the job still running from the previous tick.
                        jobId: `topic-${row.topicId}-disp-${Date.now()}`,
                        removeOnComplete: true,
                        removeOnFail: 1000,
                    },
                };
                (Number(row.wasPriority) > 0 ? priority : bulk).push(job);
            }

            await this.addBulkChunked(this.topicPriorityQueue, priority);
            await this.addBulkChunked(this.topicQueue, bulk);

            this.logger.debug(
                `Dispatcher: released ${bulk.length} routine + ${priority.length} priority topic poll(s)`,
            );
        } catch (error) {
            this.logger.warn(`Dispatcher failed: ${(error as Error).message}`);
        } finally {
            this.dispatchRunning = false;
        }
    }

    /**
     * Restarts work that fell off the queues.
     *
     * Both ingestion paths are chains, not schedules: a topic keeps syncing only
     * because the previous topic-sync job enqueued the next one, and a message is
     * parsed only because topic-sync enqueued a job for it. Anything that ends a
     * chain — an exhausted retry, a job lost to a Redict restart, an OOM at
     * enqueue time — stops that topic or message permanently, and until now the
     * only recovery was restarting the worker so boot seeding ran again.
     *
     * Rescue counts trending to zero is the signal that ingestion is healthy;
     * a persistently non-zero count means chains are still dying somewhere.
     */
    private async runReconcile(): Promise<void> {
        if (!this.isLeader || this.reconcileRunning) return;
        this.reconcileRunning = true;
        try {
            const topics = await this.rescueDeadTopicChains();
            const messages = await this.rescueStuckMessages();
            const reparsed = await this.rescueUnparsedDiscontinueMessages();
            const policyTopics = await this.requeueUnsettledPolicyTopics();
            if (topics > 0 || messages > 0 || reparsed > 0 || policyTopics > 0) {
                this.logger.log(
                    `Reconciler: restarted ${topics} topic chain(s), re-queued ${messages} stuck message(s)` +
                    (reparsed > 0 ? `, re-parsed ${reparsed} legacy discontinue message(s)` : '') +
                    (policyTopics > 0 ? `, re-checked ${policyTopics} unsettled policy topic(s)` : ''),
                );
            }
        } catch (error) {
            this.logger.warn(`Reconciler failed: ${(error as Error).message}`);
        } finally {
            this.reconcileRunning = false;
        }
    }

    /**
     * Finds topics with no job on either topic queue and starts a fresh poll.
     *
     * Liveness cannot be read from topic_cache: `lastUpdate` only moves when
     * messages actually arrive, so a topic idle for a week looks identical to
     * one whose chain died. The queues are the source of truth instead.
     *
     * The scan reads job IDs only (ZRANGE/LRANGE), never job hashes. Every topic
     * job ID embeds its topic — `topic-0.0.1234-poll-<ts>` — so a few range reads
     * replace what would otherwise be one HGETALL per queued job, the pattern
     * that saturates the connection on queues this size.
     */
    private async rescueDeadTopicChains(): Promise<number> {
        // In dispatcher mode a topic having no queued job is the NORMAL state —
        // that is the entire point — so the queue-derived liveness check below
        // would classify every topic as dead and re-enqueue the whole table on
        // every tick. Here the schedule itself is the liveness signal, and the
        // only way to fall out of it is to have no nextPollAt at all (a row
        // created while the dispatcher was not running).
        if (this.pollMode === 'dispatcher') {
            const armed = await this.dataSource.query(
                `UPDATE topic_cache
                    SET "nextPollAt" = now()
                  WHERE status <> 'DISABLED'
                    AND "nextPollAt" IS NULL
              RETURNING 1`,
            );
            return Array.isArray(armed) ? armed.length : 0;
        }

        const live = new Set<string>();
        const topicIdFromJobId = /^topic-(\d+\.\d+\.\d+)-/;

        for (const queueName of [QUEUE_NAMES.TOPIC_SYNC, QUEUE_NAMES.TOPIC_SYNC_PRIORITY]) {
            // 'paused' is scanned too: BullMQ implements pause by RENAMING the
            // wait list to paused. Without it, an operator pausing a topic queue
            // to let a backlog drain would make every topic whose job sat in
            // wait look dead, and this reconciler would bulk-enqueue thousands
            // of duplicates into the paused queue every tick — growing exactly
            // the backlog the pause was meant to drain.
            const [delayed, prioritized, waiting, active, paused] = await Promise.all([
                this.redis.zrange(`bull:${queueName}:delayed`, 0, -1),
                this.redis.zrange(`bull:${queueName}:prioritized`, 0, -1),
                this.redis.lrange(`bull:${queueName}:wait`, 0, -1),
                this.redis.lrange(`bull:${queueName}:active`, 0, -1),
                this.redis.lrange(`bull:${queueName}:paused`, 0, -1),
            ]);
            for (const jobId of [...delayed, ...prioritized, ...waiting, ...active, ...paused]) {
                const match = topicIdFromJobId.exec(jobId);
                if (match) live.add(match[1]);
            }
        }

        // Nothing queued at all usually means Redict was just flushed or the
        // queues have not been populated yet; boot seeding covers that case and
        // rescuing every topic here would enqueue the whole table at once.
        if (live.size === 0) return 0;

        // The live set is diffed in memory rather than passed to Postgres. Both
        // sides run to five and six figures here, and every SQL formulation of
        // "not in this list" (`<> ALL`, or an anti-join against unnest) plans as
        // a nested loop, because the planner has no cardinality estimate for an
        // array parameter — that is 10^9-comparison territory on this table.
        const candidates: Array<{ topicId: string; messages: number }> =
            await this.dataSource.query(
                // Bounded: enough rows to be sure of finding reconcileTopicLimit
                // that are NOT already live, without pulling a six-figure table
                // into the worker heap every tick.
                `SELECT "topicId", messages
                   FROM topic_cache
                  WHERE status <> 'DISABLED'
                  ORDER BY "lastUpdate" ASC
                  LIMIT $1`,
                [this.reconcileTopicLimit + live.size],
            );

        const rows: Array<{ topicId: string; messages: number }> = [];
        for (const row of candidates) {
            if (live.has(row.topicId)) continue;
            rows.push(row);
            if (rows.length >= this.reconcileTopicLimit) break;
        }
        if (rows.length === 0) return 0;

        const stamp = Date.now();
        await this.topicQueue.addBulk(
            rows.map(row => ({
                name: 'sync',
                data: {
                    topicId: row.topicId,
                    fromSequenceNumber: row.messages ?? 0,
                    isOrgTopic: false,
                    emptyPollStreak: 0,
                },
                opts: {
                    // Fresh chain head. Unique per rescue so it can never collide
                    // with a chain job that is still running.
                    jobId: `topic-${row.topicId}-rescue-${stamp}`,
                    removeOnComplete: true,
                },
            })),
        );
        return rows.length;
    }

    /**
     * Re-queues messages stranded at LOADED — written to message_cache but never
     * parsed, because the parse job was lost. `msg-<consensusTimestamp>` is the
     * same deterministic ID the topic-sync processors use, so a message whose job
     * is still queued is a no-op rather than a duplicate.
     */
    private async rescueStuckMessages(): Promise<number> {
        const cutoff = Date.now() - this.stuckMessageAfterMs;
        const rows: Array<{ consensusTimestamp: string; topicId: string }> =
            await this.dataSource.query(
                `SELECT "consensusTimestamp", "topicId"
                   FROM message_cache
                  WHERE status = 'LOADED'
                    AND "lastUpdate" < $1
                  ORDER BY "lastUpdate" ASC
                  LIMIT $2`,
                [cutoff, this.reconcileMessageLimit],
            );
        if (rows.length === 0) return 0;

        await this.messageQueue.addBulk(
            rows.map(row => ({
                name: 'process',
                data: {
                    consensusTimestamp: row.consensusTimestamp,
                    topicId: row.topicId,
                },
                opts: {
                    jobId: `msg-${row.consensusTimestamp}`,
                    removeOnComplete: true,
                    removeOnFail: 1000,
                },
            })),
        );
        return rows.length;
    }

    /**
     * Re-parses discontinue messages that were ingested before message-parser
     * knew those actions.
     *
     * Those runs stored the generic `Policy` shape, which drops
     * `instanceTopicId` — the only key tying a discontinuation to a published
     * version. PolicyStatusProcessor attributes candidates by it, so such rows
     * are invisible both to the per-message trigger and to the watch list, and
     * would stay that way forever: nothing re-reads a message once it is parsed.
     *
     * Nothing is re-downloaded. The raw payload is still in message_cache, so
     * this re-runs the current parser over local data and lets the ordinary
     * pipeline take it from there (the parse itself enqueues the policy-status
     * job). The join to message_cache skips rows whose cache entry is gone,
     * which would otherwise be re-enqueued on every tick and warn every time.
     *
     * Only timestamps that already have a `message` row are enqueued, never the
     * sibling chunks of a multi-chunk message: every chunk is present by now, so
     * a job per chunk would have each one reassemble and write its own row,
     * where re-parsing the existing timestamp reassembles and upserts that same
     * row. `priority: 1` keeps this ahead of the routine parse backlog, and the
     * batch bounds the knock-on topic-discovery churn each parse produces.
     *
     * Self-terminating: rows leave the result set as they are fixed, leaving one
     * indexed lookup per tick.
     */
    private async rescueUnparsedDiscontinueMessages(): Promise<number> {
        const rows: Array<{ consensusTimestamp: string; topicId: string }> =
            await this.dataSource.query(
                `SELECT m."consensusTimestamp", m."topicId"
                   FROM message m
                   JOIN message_cache mc ON mc."consensusTimestamp" = m."consensusTimestamp"
                  WHERE m.type = 'Policy'
                    AND m.action = ANY($1::text[])
                    AND NOT (m.options ? 'instanceTopicId')
                  ORDER BY m."consensusTimestamp"
                  LIMIT $2`,
                [[...DISCONTINUE_ACTIONS], this.reconcileDiscontinueReparseLimit],
            );
        if (rows.length === 0) return 0;

        await this.messageQueue.addBulk(
            rows.map(row => ({
                name: 'process',
                data: {
                    consensusTimestamp: row.consensusTimestamp,
                    topicId: row.topicId,
                },
                opts: {
                    jobId: `msg-${row.consensusTimestamp}`,
                    priority: 1,
                    removeOnComplete: true,
                    removeOnFail: 1000,
                },
            })),
        );
        return rows.length;
    }

    /**
     * Re-queues the policy topics whose discontinuation state is not settled yet.
     *
     * This is the watch list. A policy topic enters it when a discontinue message
     * arrives on it, and leaves only once EVERY version that message set names has
     * an immediate `discontinue-policy` recorded on its business_view row.
     * Immediate is the only terminal state: a deferred discontinuation can still
     * be edited to a new date or superseded, so its topic keeps coming back.
     *
     * Terminality is judged per version, not per topic. A topic can hold several
     * published versions, one discontinued immediately and another only deferred —
     * dropping the topic on the first immediate message would abandon the second.
     *
     * The exclusion keys off the STORED result rather than the message, so a topic
     * also stays here until its status is actually written. That is what covers
     * the two cases the per-message trigger cannot: a methodology discontinued
     * before the business-view builder ever created its row (the builder runs
     * every two minutes), and a job that exhausted its attempts.
     *
     * Cheap enough to run unconditionally: an anti-join over the few hundred
     * topics a discontinuation has ever touched, both sides index-served.
     */
    private async requeueUnsettledPolicyTopics(): Promise<number> {
        const rows: Array<{ policyTopicId: string }> = await this.dataSource.query(
            `WITH watched AS (
                 SELECT DISTINCT "topicId" AS policy_topic_id,
                        COALESCE(options->>'instanceTopicId', '') AS instance_topic_id
                   FROM message
                  WHERE type = 'Policy'
                    AND action = ANY($1::text[])
             )
             SELECT DISTINCT w.policy_topic_id AS "policyTopicId"
               FROM watched w
              WHERE NOT EXISTS (
                  SELECT 1
                    FROM business_view bv
                   WHERE bv."viewType" = 'METHODOLOGY'
                     AND bv."relatedTopicId" = w.instance_topic_id
                     AND bv."businessData"->>'discontinuedAction' = 'discontinue-policy'
              )`,
            [[...DISCONTINUE_ACTIONS]],
        );
        if (rows.length === 0) return 0;

        // The minute bucket keeps consecutive ticks from colliding with the
        // retained-jobId dedup window, while still collapsing duplicates within
        // one tick.
        const bucket = Math.floor(Date.now() / 60_000);
        await this.policyStatusQueue.addBulk(
            rows.map(row => ({
                name: 'resolve',
                data: { policyTopicId: row.policyTopicId, reason: 'watch' as const },
                opts: {
                    jobId: `policy-status-${row.policyTopicId}-watch-${bucket}`,
                    removeOnComplete: true,
                },
            })),
        );
        return rows.length;
    }

    /**
     * Tries to acquire a distributed lock for scheduler leadership.
     * Lock TTL is 30s, renewed every 15s by the leader.
     */
    private async tryAcquireLeader(): Promise<boolean> {
        return this.leaderLock.tryAcquire();
    }

    /**
     * Idempotent upsert of the root topic into topic_cache.
     * Always runs on startup — resets hasNext=true so a restart resumes crawling
     * even if the topic was previously marked exhausted.
     */
    private async seedRootTopic(): Promise<void> {
        const network = this.configService.get<string>('app.hedera.network') || 'testnet';
        const seedTopicId = this.configService.get<string>('app.seedTopicId')
            || ROOT_TOPICS[network];

        if (!seedTopicId) {
            this.logger.warn(`No seed topic ID for network "${network}" — cannot bootstrap`);
            return;
        }

        await this.dataSource.query(
            `INSERT INTO topic_cache ("topicId", status, messages, "hasNext", "lastUpdate")
             VALUES ($1, 'NEW', 0, true, $2)
             ON CONFLICT ("topicId") DO UPDATE SET
                 "hasNext"    = true,
                 "lastUpdate" = EXCLUDED."lastUpdate"`,
            [seedTopicId, Date.now().toString()],
        );

        this.logger.log(`Seeded root topic ${seedTopicId} for ${network} network`);
    }

    /**
     * Schedules repeating maintenance jobs (only run by leader).
     */
    private async scheduleAllJobs(): Promise<void> {
        try {
            await this.scheduleMvRefresh();
            await this.scheduleBusinessViewBuilder();
            this.logger.log('All repeating jobs scheduled');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to schedule repeating jobs: ${message}`);
        }
    }

    /**
     * Reads topic_cache and creates topic-sync jobs with their watermarks.
     * Safe to run on multiple instances — jobId prevents duplicates.
     */
    private async scheduleTopicSyncs(): Promise<void> {
        const topics = await this.dataSource.query(
            `SELECT "topicId", messages, "hasNext" FROM topic_cache WHERE status != 'DISABLED'`,
        );

        // Root/seed topic is how every new policy gets discovered — routed onto
        // TOPIC_SYNC_PRIORITY instead of the bulk backlog (see bullmq.config.ts).
        const network = this.configService.get<string>('app.hedera.network') || 'testnet';
        const seedTopicId = this.configService.get<string>('app.seedTopicId')
            || ROOT_TOPICS[network];

        // In dispatcher mode the schedule IS the seeding. Enqueueing a job per
        // topic here would recreate at boot exactly the six-figure resident job
        // set the dispatcher exists to remove, so instead arm any topic that has
        // no schedule yet and let the dispatcher release them a batch per tick.
        if (this.pollMode === 'dispatcher') {
            const armed = await this.dataSource.query(
                `UPDATE topic_cache
                    SET "nextPollAt" = now()
                  WHERE status <> 'DISABLED'
                    AND "nextPollAt" IS NULL
              RETURNING 1`,
            );
            this.logger.log(
                `Armed ${Array.isArray(armed) ? armed.length : 0} unscheduled topic(s) for dispatch ` +
                `(${topics.length} total, released ${this.dispatchBatch} per tick)`,
            );
            return;
        }

        // Stable jobId on (topicId, watermark), and NO pre-remove. Seeding means
        // "make sure this topic has a sync job", not "force a new one": if a job
        // at this watermark is already waiting, delayed or running, the topic is
        // covered and re-adding is a no-op. Removing first was a cross-replica
        // race — one instance's remove could land between another's remove and
        // add, or delete a job a worker had already picked up.
        const priorityJobs: BulkJob[] = [];
        const bulkJobs: BulkJob[] = [];

        for (const topic of topics) {
            const isOrgTopic = topic.topicId === seedTopicId;
            const fromSeq = topic.messages || 0;
            (isOrgTopic ? priorityJobs : bulkJobs).push({
                name: 'sync',
                data: {
                    topicId: topic.topicId,
                    fromSequenceNumber: fromSeq,
                    isOrgTopic,
                },
                opts: { jobId: `topic-${topic.topicId}-${fromSeq}` },
            });
        }

        const enqueued =
            await this.addBulkChunked(this.topicPriorityQueue, priorityJobs) +
            await this.addBulkChunked(this.topicQueue, bulkJobs);

        this.logger.log(`Enqueued ${enqueued} topic sync jobs from cache`);
    }

    /**
     * Reads token_cache and creates token-sync jobs.
     *
     * - Tokens with hasNext=true are synced from their watermark to pick up new serials.
     * - All NFT tokens are also re-synced from serial 0 so that any retirements
     *   (deleted=true in nft_cache) that occurred since the last sync are detected.
     */
    private async scheduleTokenSyncs(): Promise<void> {
        // All three passes below use a stable jobId per (token, purpose) and no
        // pre-remove — see scheduleTopicSyncs for why removing first is unsafe
        // once more than one instance can be booting.
        const pendingTokens = await this.dataSource.query(
            `SELECT "tokenId", "serialNumber" FROM token_cache WHERE "hasNext" = true`,
        );
        await this.addBulkChunked(this.tokenQueue, pendingTokens.map((token: {
            tokenId: string; serialNumber: number | null;
        }) => ({
            name: 'sync',
            data: {
                tokenId: token.tokenId,
                fetchNfts: true,
                fromSerial: token.serialNumber || 0,
            },
            opts: { jobId: `token-${token.tokenId}-init` },
        })));

        // Re-sync all NFT tokens from serial 0 to detect retirements.
        const nftTokens = await this.dataSource.query(
            `SELECT "tokenId" FROM token_cache WHERE type = 'NON_FUNGIBLE_UNIQUE'`,
        );
        await this.addBulkChunked(this.tokenQueue, nftTokens.map((token: { tokenId: string }) => ({
            name: 'sync',
            data: { tokenId: token.tokenId, fetchNfts: true, fromSerial: 0 },
            opts: { jobId: `token-${token.tokenId}-retirement` },
        })));

        // Fungible tokens carry no serials, so the hasNext watermark above never
        // brings them back. Re-sync them here to pick up mint transactions added
        // since the last pass; the per-token mintTxWatermark keeps this cheap.
        const fungibleTokens = await this.dataSource.query(
            `SELECT "tokenId" FROM token_cache WHERE type = 'FUNGIBLE_COMMON'`,
        );
        await this.addBulkChunked(this.tokenQueue, fungibleTokens.map((token: { tokenId: string }) => ({
            name: 'sync',
            data: { tokenId: token.tokenId, fetchNfts: false, fromSerial: 0 },
            opts: { jobId: `token-${token.tokenId}-fungible-mints` },
        })));

        const treasuries = await this.scheduleTreasuryTransferSweeps();

        this.logger.log(
            `Enqueued ${pendingTokens.length} incremental token sync(s), ` +
            `${nftTokens.length} NFT retirement check(s), ` +
            `${fungibleTokens.length} fungible mint check(s), ` +
            `${treasuries} treasury transfer sweep(s)`,
        );
    }

    /**
     * Enqueues one transfer sweep per NFT treasury, never-scanned accounts first.
     *
     * Transfers are readable only from an account's transaction list, and a
     * registry treasury commonly issues hundreds of tokens, so the account —
     * not the token — is the unit of work: 17,743 testnet tokens resolve to
     * 6,978 accounts, and the busiest single account backs 1,072 tokens.
     *
     * Ordering matters as much as the grouping. Accounts already walked to the
     * present are cheap to re-check but add nothing, so they go last; a sweep
     * interrupted by a restart then resumes into unscanned accounts instead of
     * repeating the ones it already finished.
     */
    private async scheduleTreasuryTransferSweeps(): Promise<number> {
        // Every token of a treasury shares one watermark, so grouping token_cache
        // by treasury yields both the work list and each account's scan position
        // — no separate bookkeeping table to keep in step with it.
        //
        // NULLS FIRST puts never-scanned accounts at the front; the rest follow
        // oldest position first, which leaves accounts already caught up to the
        // present at the back where a re-check costs one page.
        const treasuries: Array<{ treasury: string }> = await this.dataSource.query(`
            SELECT treasury
            FROM token_cache
            WHERE treasury IS NOT NULL AND type = 'NON_FUNGIBLE_UNIQUE'
            GROUP BY treasury
            ORDER BY MAX("transferTxWatermark") ASC NULLS FIRST, treasury
        `);

        // addBulk preserves the ordering established above, so never-scanned
        // accounts still enter the queue first.
        await this.addBulkChunked(this.tokenQueue, treasuries.map(({ treasury }) => ({
            name: TREASURY_TRANSFERS_JOB,
            data: { treasury },
            opts: { jobId: `treasury-${treasury}-sweep` },
        })));

        return treasuries.length;
    }

    /**
     * Discovers Guardian's RETIRE contracts and enqueues a log sync for each.
     *
     * Discovery has two sources because `contractId`/`contractType` were not
     * always extracted by the message parser: newly parsed Contract messages
     * carry them in `options`, while older rows only have them inside the raw
     * HCS payload in message_cache. Both are read, so no contract is missed on
     * an existing database.
     */
    private async scheduleRetireSyncs(): Promise<void> {
        // Source 1 — parsed messages.
        await this.dataSource.query(`
            INSERT INTO contract_cache (contract_id, contract_type, topic_id, owner, last_update)
            SELECT DISTINCT ON (m.options->>'contractId')
                   m.options->>'contractId',
                   m.options->>'contractType',
                   m."topicId",
                   m.owner,
                   $1
            FROM message m
            WHERE m.type = 'Contract' AND m.options->>'contractId' IS NOT NULL
            ORDER BY m.options->>'contractId', m."consensusTimestamp" DESC
            ON CONFLICT (contract_id) DO UPDATE SET
                contract_type = COALESCE(EXCLUDED.contract_type, contract_cache.contract_type),
                topic_id      = COALESCE(EXCLUDED.topic_id, contract_cache.topic_id),
                owner         = COALESCE(EXCLUDED.owner, contract_cache.owner)
        `, [Date.now().toString()]);

        // Source 2 — raw payloads of Contract messages parsed before contractId
        // was extracted. Decoded in JS so one malformed payload can't abort the
        // batch the way a SQL-side jsonb cast would.
        const raw: Array<{ consensusTimestamp: string; topicId: string; owner: string | null; message: string }> =
            await this.dataSource.query(`
                SELECT mc."consensusTimestamp", mc."topicId", m.owner, mc.message
                FROM message_cache mc
                JOIN message m ON m."consensusTimestamp" = mc."consensusTimestamp"
                WHERE m.type = 'Contract'
                  AND m.options->>'contractId' IS NULL
                  AND COALESCE(mc."chunkTotal", 1) = 1
            `);
        for (const r of raw) {
            let payload: Record<string, unknown>;
            try {
                payload = JSON.parse(Buffer.from(r.message, 'base64').toString('utf8'));
            } catch {
                continue;
            }
            const contractId = payload['contractId'];
            if (typeof contractId !== 'string' || !contractId) {
                continue;
            }
            await this.dataSource.query(`
                INSERT INTO contract_cache (contract_id, contract_type, topic_id, owner, last_update)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (contract_id) DO UPDATE SET
                    contract_type = COALESCE(EXCLUDED.contract_type, contract_cache.contract_type),
                    topic_id      = COALESCE(EXCLUDED.topic_id, contract_cache.topic_id),
                    owner         = COALESCE(EXCLUDED.owner, contract_cache.owner)
            `, [contractId, payload['contractType'] ?? null, r.topicId, r.owner, Date.now().toString()]);
        }

        const retireContracts: Array<{ contract_id: string }> = await this.dataSource.query(
            `SELECT contract_id FROM contract_cache WHERE contract_type = 'RETIRE'`,
        );
        await this.addBulkChunked(this.retireQueue, retireContracts.map(c => ({
            name: 'sync',
            data: { contractId: c.contract_id },
            opts: { jobId: `retire-${c.contract_id}` },
        })));

        this.logger.log(`Enqueued ${retireContracts.length} retirement contract sync(s)`);
    }

    /**
     * Finds published Instance-Policy messages whose policy hasn't been decoded
     * successfully yet, and re-enqueues them for the PolicyDecodeProcessor.
     *
     * Re-enqueue when:
     *   - No row in policy table (never attempted), OR
     *   - decodeStatus != 'decoded' (pending or failed — give it another chance).
     *
     * Policies with decodeStatus='decoded' are NOT re-enqueued. This prevents the
     * boot-storm regression where successful decodes get retried every restart,
     * eventually failing once the IPFS CID becomes unreachable and flipping
     * status from 'decoded' to 'failed'.
     */
    private async schedulePolicyDecodeJobs(): Promise<void> {
        const rows: Array<{
            policy_topic_id: string;
            instance_topic_id: string;
            consensus_timestamp: string;
            cid: string;
        }> = await this.dataSource.query(`
                SELECT
                    COALESCE(NULLIF(m.options->>'topicId', ''), m."topicId") AS policy_topic_id,
                    COALESCE(m.options->>'instanceTopicId', '')  AS instance_topic_id,
                    m."consensusTimestamp"                       AS consensus_timestamp,
                    f.cid
                FROM message m
                CROSS JOIN LATERAL UNNEST(m.files) AS f(cid)
                WHERE m.type = 'Instance-Policy'
                  AND m.action ILIKE 'publish-policy'
                  AND m.files IS NOT NULL
                  AND array_length(m.files, 1) > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM policy p
                      WHERE p."policyTopicId" = COALESCE(NULLIF(m.options->>'topicId', ''), m."topicId")
                        AND COALESCE(p."instanceTopicId", '') =
                            COALESCE(m.options->>'instanceTopicId', '')
                        AND p."decodeStatus" = 'decoded'
                  )
            `);

        // Keyed on the CID alone, matching the unit of work: the decode lease in
        // policy-decode.processor.ts conflicts on "sourceCid", and the zip a CID
        // names is immutable. The previous Date.now() suffix meant this jobId
        // could never dedupe, so every boot enqueued a fresh decode for every
        // not-yet-decoded policy — on top of whatever was already queued.
        await this.addBulkChunked(this.policyDecodeQueue, rows.map(row => ({
            name: 'decode',
            data: {
                cid: row.cid,
                messageTimestamp: row.consensus_timestamp,
                policyTopicId: row.policy_topic_id,
                instanceTopicId: row.instance_topic_id,
            } satisfies PolicyDecodeJobData,
            opts: { jobId: `policy-decode-${row.cid}` },
        })));

        this.logger.log(`Enqueued ${rows.length} missing policy decode job(s)`);
    }

    /**
     * Boot-time rescue for orphaned topics: topic IDs that other messages
     * reference (Topic.options.childId or Instance-Policy.options.instanceTopicId)
     * but which never made it into topic_cache — typically because their
     * topic-sync job failed and left the whole subtree unreachable. Re-enqueue a
     * fresh topic-sync (from watermark 0) for each, removing any stale job first.
     */
    private async rescheduleOrphanedTopics(): Promise<void> {
        const rows: Array<{ topic_id: string }> = await this.dataSource.query(`
            SELECT DISTINCT refs.topic_id
            FROM (
                SELECT m.options->>'childId' AS topic_id
                FROM message m
                WHERE m.type = 'Topic'
                  AND m.options->>'childId' IS NOT NULL
                UNION
                SELECT m.options->>'instanceTopicId' AS topic_id
                FROM message m
                WHERE m.type = 'Instance-Policy'
                  AND m.options->>'instanceTopicId' IS NOT NULL
            ) refs
            WHERE refs.topic_id IS NOT NULL
              AND refs.topic_id <> ''
              AND NOT EXISTS (
                  SELECT 1 FROM topic_cache tc WHERE tc."topicId" = refs.topic_id
              )
        `);

        // Distinct jobId from the discovery path's `topic-<id>-0`: these two
        // producers used to share an id, so when discovery's job was mid-flight
        // the rescue silently collapsed into it and the orphan stayed unrescued.
        const enqueued = await this.addBulkChunked(this.topicQueue, rows.map(row => ({
            name: 'sync',
            data: {
                topicId: row.topic_id,
                fromSequenceNumber: 0,
                isOrgTopic: false,
            },
            opts: { jobId: `topic-${row.topic_id}-rescue` },
        })));

        if (enqueued > 0) {
            this.logger.log(`Rescued ${enqueued} orphaned topic(s) missing from topic_cache`);
        }
    }

    /**
     * Enqueue an IPFS fetch with stable jobId, but first remove any prior job
     * of the same id from BullMQ. Required for backfills: stable jobIds dedupe
     * during normal sync, but they also block re-runs of jobs that previously
     * failed and are still parked in BullMQ's failed-set (kept by `removeOnFail`).
     * The pre-remove forces BullMQ to create a fresh job entry that actually
     * executes again. Errors from `remove()` are ignored — most commonly the
     * job didn't exist.
     */
    private async requeueIpfsFetch(cid: string, messageTimestamp: string): Promise<void> {
        const jobId = `ipfs-${cid}`;
        try {
            await this.ipfsQueue.remove(jobId);
        } catch {
            // Job didn't exist or was already gone — fine.
        }
        await this.ipfsQueue.add(
            'fetch',
            { cid, messageTimestamp },
            { jobId },
        );
    }

    /**
     * Boot-time backfill: for every successfully decoded policy, enqueue IPFS fetch
     * jobs for any VC-Document messages under that policy's topic subtree that still
     * have documents = NULL (fetch was deferred while the policy was being decoded).
     *
     * Uses stable jobId `ipfs-${cid}` matching the convention in MessageProcessProcessor,
     * so BullMQ deduplicates against any already-queued or completed jobs.
     */
    private async backfillSuccessfulPolicyVcFetches(): Promise<void> {
        // This sweep is unbounded by nature — every un-fetched VC across every
        // decoded policy's whole topic subtree — and IPFS_FETCH is the narrowest
        // lane in the system. Check Redict headroom and the lane's existing depth
        // before adding to it; whatever is skipped is picked up on a later pass.
        if (!await canEnqueueBulk(this.redis, this.ipfsQueue, 'policy VC backfill')) return;

        const policies: Array<{ policyTopicId: string }> = await this.dataSource.query(
            `SELECT DISTINCT "policyTopicId" FROM policy WHERE "decodeStatus" = 'decoded'`,
        );

        const budget = envInt('BACKFILL_BATCH', 2000);
        let total = 0;
        for (const policy of policies) {
            if (total >= budget) {
                this.logger.log(
                    `Boot backfill: stopped at ${budget} deferred VC fetch(es) — resumes next pass`,
                );
                break;
            }
            const rows: Array<{ consensusTimestamp: string; cid: string }> =
                await this.dataSource.query(
                    `WITH RECURSIVE descendants AS (
                         SELECT $1::text AS "topicId"
                         UNION ALL
                         SELECT t."topicId"
                         FROM message t
                         JOIN descendants d ON (t.options->>'parentId') = d."topicId"
                         WHERE t.type = 'Topic'
                     )
                     SELECT m."consensusTimestamp", c.cid
                     FROM message m
                     JOIN descendants d ON d."topicId" = m."topicId"
                     CROSS JOIN LATERAL unnest(m.files) AS c(cid)
                     WHERE m.type = 'VC-Document'
                       AND m.documents IS NULL
                       AND m.files IS NOT NULL
                       AND NOT EXISTS (
                           SELECT 1 FROM ipfs_fetch_failure ff WHERE ff.cid = c.cid
                       )`,
                    [policy.policyTopicId],
                );

            for (const row of rows) {
                await this.requeueIpfsFetch(row.cid, row.consensusTimestamp);
                total++;
            }
        }

        if (total > 0) {
            this.logger.log(
                `Boot backfill: enqueued ${total} deferred VC IPFS fetch(es) across ${policies.length} decoded polic(ies)`,
            );
        }
    }

    /**
     * Boot-time backfill: for every Standard Registry profile topic, enqueue
     * IPFS fetches for any VC-Document whose `documents` is still null. These
     * VCs hold the OrganizationName used as the registry display-name fallback,
     * and they were skipped by the pre-fix `enqueueVcIpfsFetchIfReady` because
     * they have no parent policy.
     */
    private async backfillRegistryProfileVcFetches(): Promise<void> {
        if (!await canEnqueueBulk(this.redis, this.ipfsQueue, 'registry profile backfill')) return;

        const rows: Array<{ consensusTimestamp: string; cid: string }> =
            await this.dataSource.query(
                `SELECT m."consensusTimestamp", c.cid
                 FROM message m
                 CROSS JOIN LATERAL unnest(m.files) AS c(cid)
                 WHERE m.type = 'VC-Document'
                   AND m.documents IS NULL
                   AND m.files IS NOT NULL
                   AND m."topicId" IN (
                       SELECT DISTINCT options->>'topicId'
                       FROM message
                       WHERE type = 'Standard Registry'
                         AND options->>'topicId' IS NOT NULL
                   )
                   AND NOT EXISTS (
                       SELECT 1 FROM ipfs_fetch_failure ff WHERE ff.cid = c.cid
                   )
                 LIMIT $1`,
                [envInt('BACKFILL_BATCH', 2000)],
            );

        for (const row of rows) {
            await this.requeueIpfsFetch(row.cid, row.consensusTimestamp);
        }

        if (rows.length > 0) {
            this.logger.log(
                `Boot backfill: enqueued ${rows.length} deferred registry profile VC IPFS fetch(es)`,
            );
        }
    }

    /**
     * Boot-time backfill: rebuild PROJECT rows from all already-fetched VCs.
     *
     * The per-VC upsert SUMs credits and increments vcCount, so re-running it
     * over the same VC inflates the totals. We guard against that by clearing
     * all PROJECT rows first, then replaying every fetched VC in chronological
     * order. End state is the same as if every VC had streamed through the
     * eager path exactly once.
     *
     * Skipped when there are no fetched VCs to replay (cheap probe).
     */
    private async backfillProjectMappings(): Promise<void> {
        // Serialized across processes for the whole delete-and-replay span.
        // The mapper accumulates credits with SUM semantics, so two overlapping
        // replays double-count: one instance's DELETE landing partway through
        // another's replay produces silently wrong credit totals. Leader
        // election alone does not cover this — a failover mid-backfill would
        // start a second replay while the first is still running.
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        const acquired: Array<{ locked: boolean }> = await runner.query(
            `SELECT pg_try_advisory_lock(hashtext('se:project-backfill')) AS locked`,
        );
        if (!acquired[0]?.locked) {
            this.logger.warn('Project backfill already running elsewhere — skipping');
            await runner.release();
            return;
        }

        try {
            await this.runProjectBackfill();
        } finally {
            await runner
                .query(`SELECT pg_advisory_unlock(hashtext('se:project-backfill'))`)
                .catch(() => {});
            await runner.release();
        }
    }

    private async runProjectBackfill(): Promise<void> {
        const probe: Array<{ count: string }> = await this.dataSource.query(
            `SELECT COUNT(*)::text AS count FROM message
             WHERE type='VC-Document' AND documents IS NOT NULL`,
        );
        const total = parseInt(probe[0]?.count ?? '0', 10);
        if (total === 0) return;

        await this.dataSource.query(
            `DELETE FROM business_view WHERE "viewType"='PROJECT'`,
        );

        const rows: Array<{ consensusTimestamp: string }> = await this.dataSource.query(
            `SELECT m."consensusTimestamp"
             FROM message m
             WHERE m.type = 'VC-Document'
               AND m.documents IS NOT NULL
             ORDER BY m."consensusTimestamp"`,
        );

        let processed = 0;
        let errors = 0;
        for (const row of rows) {
            try {
                await this.projectMapperService.upsertProjectFromVc(row.consensusTimestamp);
                processed++;
            } catch (err) {
                errors++;
                this.logger.warn(
                    `backfillProjectMappings: vc=${row.consensusTimestamp} failed: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        }

        const projectCount: Array<{ count: string }> = await this.dataSource.query(
            `SELECT COUNT(*)::text AS count FROM business_view WHERE "viewType"='PROJECT'`,
        );
        this.logger.log(
            `Boot backfill: replayed ${processed}/${total} VCs through project mapper (errors: ${errors}); ${projectCount[0].count} project row(s) produced`,
        );
    }

    private async scheduleMvRefresh(): Promise<void> {
        const mvRefreshInterval = this.configService.get<number>('app.mvRefreshInterval')! * 1000;

        // upsertJobScheduler is atomic and idempotent, replacing a
        // delete-every-repeatable-then-re-add sequence that was neither. That
        // pattern deleted repeatables belonging to *any* scheduler on the queue,
        // so during the brief window where two instances both believed they were
        // leader, one could delete the other's freshly-created schedule and MV
        // refresh would silently stop until the next boot.
        await this.mvRefreshQueue.upsertJobScheduler(
            'mv-refresh',
            { every: mvRefreshInterval },
            { name: 'refresh-mvs' },
        );

        this.logger.log(`Scheduled MV refresh every ${mvRefreshInterval / 1000}s`);
    }

    private async scheduleBusinessViewBuilder(): Promise<void> {
        // Registry/methodology/credit upserts still run here, but project mapping
        // is now primarily handled by eager per-VC upserts in IpfsFetchProcessor.
        // This batch job is the reconciliation/cleanup pass.
        //
        // Every run is a full scan of `message`, so the cadence is a real cost.
        // It is now configurable and stated once: the code, its comment and the
        // log line previously disagreed (2 minutes, "60-minute", "every 60
        // minutes"), so nobody reading this could tell how often it actually ran.
        const interval = envInt('BUSINESS_VIEW_BUILD_INTERVAL_MS', 2 * 60 * 1000);

        // Fanned out one job per view type instead of a single whole-table run.
        // The partitions are disjoint in business_view's conflict key, so they
        // proceed in parallel without contending; a single job could not use the
        // queue's concurrency at all, because extra concurrent runs of the SAME
        // statement are duplicate work that serialises on each other's row locks.
        //
        // Retires the older unpartitioned scheduler so a redeploy does not leave
        // it firing full-table rebuilds alongside the partitioned ones.
        await this.businessViewQueue.removeJobScheduler('business-view-build').catch(() => undefined);

        for (const viewType of BUSINESS_VIEW_PARTITIONS) {
            // Immediate one-shot so registries/methodologies/credits populate
            // within seconds of boot rather than waiting for the first repeat.
            await this.businessViewQueue.add(
                'build-business-views',
                { viewType },
                { jobId: `business-view-build-initial-${viewType}-${Date.now()}` },
            );

            // Atomic + idempotent — see scheduleMvRefresh for why the previous
            // purge-then-re-add was unsafe with more than one instance.
            await this.businessViewQueue.upsertJobScheduler(
                `business-view-build-${viewType.toLowerCase()}`,
                { every: interval },
                { name: 'build-business-views', data: { viewType } },
            );
        }

        this.logger.log(
            `Scheduled business view builder: initial run + every ${interval / 1000}s ` +
            `across ${BUSINESS_VIEW_PARTITIONS.length} partitions ` +
            `(${BUSINESS_VIEW_PARTITIONS.join(', ')})`,
        );
    }
}
