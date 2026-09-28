import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES, getWorkerOptions, getTopicPollMode, TopicPollMode } from '@shared/config/bullmq.config';
import { HederaService, TopicMessage } from '../services/hedera.service';
import { isTopicBlocked } from '@shared/config/topic-blocklist';

export interface TopicSyncJobData {
    topicId: string;
    fromSequenceNumber: number;
    isOrgTopic: boolean;
    // Consecutive empty-poll count; drives backoff. Reset to 0 on real messages.
    emptyPollStreak?: number;
    // Set by message-process.processor.ts on first-ever discovery of a topic so
    // it gets an expedited initial sync on TOPIC_SYNC_PRIORITY instead of queuing
    // behind TOPIC_SYNC's bulk backlog.
    oneTimePriority?: boolean;
}

@Processor(QUEUE_NAMES.TOPIC_SYNC, getWorkerOptions(QUEUE_NAMES.TOPIC_SYNC))
export class TopicSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(TopicSyncProcessor.name);
    private readonly pollDelay: number;
    private readonly orgPollDelay: number;
    private readonly maxPollDelay: number;
    private readonly pollMode: TopicPollMode = getTopicPollMode();

    constructor(
        private readonly hederaService: HederaService,
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @InjectQueue(QUEUE_NAMES.MESSAGE_PARSE) private readonly messageQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
    ) {
        super();
        this.pollDelay = this.configService.get<number>('app.mirrorNodePollDelay') ?? 30000;
        // Org topics poll 3x faster for quicker visibility of org-specific events
        this.orgPollDelay = Math.max(1000, Math.floor(this.pollDelay / 3));
        // Ceiling for the empty-poll backoff below.
        this.maxPollDelay = this.configService.get<number>('app.mirrorNodeMaxPollDelay') ?? 1_800_000;
    }

    async process(job: Job<TopicSyncJobData>): Promise<void> {
        const { topicId, fromSequenceNumber, isOrgTopic, emptyPollStreak = 0 } = job.data;

        if (isTopicBlocked(topicId)) {
            this.logger.debug(`Topic ${topicId} is blocklisted — skipping sync`);
            return;
        }

        const fromSeq = await this.resolveFromSequence(topicId, fromSequenceNumber);

        this.logger.log(`Syncing topic ${topicId} from seq ${fromSeq}`);

        const { messages } = await this.hederaService.getMessages(topicId, fromSeq);

        if (messages.length === 0) {
            // No new messages — re-enqueue with a delay, backing off exponentially
            // the longer the topic stays quiet (capped at maxPollDelay).
            // Uses timestamp in jobId so each poll creates a fresh job
            // (BullMQ dedupes completed/stale jobIds).
            const baseDelay = isOrgTopic ? this.orgPollDelay : this.pollDelay;
            const streak = emptyPollStreak + 1;
            const delay = Math.min(baseDelay * 2 ** Math.min(streak, 10), this.maxPollDelay);

            // Persist the schedule in BOTH modes, so switching to the dispatcher
            // needs no backfill and switching back loses nothing.
            await this.recordNextPoll(topicId, delay);

            if (this.pollMode === 'chain') {
                await this.topicQueue.add('sync', {
                    topicId,
                    fromSequenceNumber: fromSeq,
                    isOrgTopic,
                    emptyPollStreak: streak,
                }, {
                    jobId: `topic-${topicId}-poll-${Date.now()}`,
                    delay,
                    // Each poll is a uniquely-named keep-alive job; without these the
                    // completed/failed sets grow unbounded and eventually OOM Redict.
                    removeOnComplete: true,
                    removeOnFail: 1000,
                });
            }
            this.logger.debug(`No new messages for topic ${topicId}, re-polling in ${delay}ms (streak=${streak})`);
            return;
        }

        const maxSequence = Math.max(...messages.map(m => m.sequence_number));
        const hasNext = messages.length >= 100;
        const now = Date.now().toString();

        // 1. Batch insert into message_cache within a transaction
        await this.batchInsertMessages(messages, topicId, now);

        // 2. Bulk enqueue message processing jobs
        await this.messageQueue.addBulk(
            messages.map(msg => ({
                name: 'process',
                data: {
                    consensusTimestamp: msg.consensus_timestamp,
                    topicId,
                },
                opts: {
                    priority: isOrgTopic ? 1 : 10,
                    jobId: `msg-${msg.consensus_timestamp}`,
                    // Trim on finish — message data lives in Postgres, so retained
                    // completed/failed job hashes are pure Redict bloat.
                    removeOnComplete: true,
                    removeOnFail: 1000,
                },
            })),
        );

        // 3. Update watermark LAST — if we crash before here,
        //    the watermark stays at the old value and messages
        //    will be re-fetched on restart (idempotent via ON CONFLICT)
        await this.dataSource.query(
            `INSERT INTO topic_cache ("topicId", messages, "hasNext", "lastUpdate", status)
             VALUES ($4, $1, $2, $3, 'SYNCED')
             ON CONFLICT ("topicId") DO UPDATE SET
                 messages = EXCLUDED.messages,
                 "hasNext" = EXCLUDED."hasNext",
                 "lastUpdate" = EXCLUDED."lastUpdate",
                 status = 'SYNCED'`,
            [maxSequence, hasNext, now, topicId],
        );

        // 4. Continue.
        //    - Full page: chase the next page immediately, on the queue, in both
        //      modes. A catch-up chain is hot, bounded by the topic's remaining
        //      history, and finishes in seconds — routing it through a 5-second
        //      dispatcher tick would slow ingestion for no benefit. The dispatcher
        //      only ever owns the IDLE polling that would otherwise park a job per
        //      topic forever.
        //    - Partial page: caught up, so this becomes a scheduled re-poll.
        const nextDelay = hasNext ? 100 : (isOrgTopic ? this.orgPollDelay : this.pollDelay);

        // Only a topic that is CAUGHT UP gets a dispatcher schedule. While a
        // catch-up chain is running the queue owns this topic, so the row is
        // parked out of the dispatcher's reach instead: recording the real 100 ms
        // page delay would round to a 1-second interval and the dispatcher would
        // release a second, independently-jobId'd sync for the same topic a
        // second later — paging it twice against mirror-node, inserting every
        // message twice, and re-firing every second until the chain finished.
        if (hasNext) {
            await this.parkFromDispatcher(topicId);
        } else {
            await this.recordNextPoll(topicId, nextDelay);
        }

        if (hasNext || this.pollMode === 'chain') {
            await this.topicQueue.add('sync', {
                topicId,
                fromSequenceNumber: maxSequence,
                isOrgTopic,
                emptyPollStreak: 0, // real messages arrived — reset the backoff
            }, {
                jobId: `topic-${topicId}-${maxSequence}-${Date.now()}`,
                delay: nextDelay,
                // Uniquely-named per page/watermark — trim on finish so they don't
                // accumulate in the completed/failed sets and exhaust Redict memory.
                removeOnComplete: true,
                removeOnFail: 1000,
            });
        }

        this.logger.log(
            `Topic ${topicId}: ${messages.length} messages, maxSeq=${maxSequence}, hasNext=${hasNext}`,
        );
    }

    /**
     * Records when this topic should next be polled, and the backoff that
     * produced that time.
     *
     * This is the schedule the dispatcher reads, so it is only written in
     * `dispatcher` mode. In `chain` mode nothing reads it — each job enqueues its
     * own successor — and writing it anyway cost one UPDATE per poll against a
     * six-figure backlog, which held topic_cache at roughly two dead tuples per
     * live row and parked workers in LWLock/WALWrite.
     *
     * Skipping it in chain mode needs no backfill: the dispatcher arms every row
     * whose `nextPollAt` IS NULL when it starts (see SyncSchedulerService), so
     * switching modes still comes up against a fully populated schedule.
     *
     * `pollIntervalSec` is stored alongside so the dispatcher can re-arm a topic
     * it hands out without recomputing the backoff.
     */
    private async recordNextPoll(topicId: string, delayMs: number): Promise<void> {
        if (this.pollMode !== 'dispatcher') return;
        const seconds = Math.max(1, Math.round(delayMs / 1000));
        await this.dataSource.query(
            `UPDATE topic_cache
                SET "nextPollAt"      = now() + ($2::int * interval '1 second'),
                    "pollIntervalSec" = $2::int
              WHERE "topicId" = $1`,
            [topicId, seconds],
        );
    }

    /**
     * Holds a topic out of the dispatcher while its catch-up chain runs.
     *
     * The park is a timeout, not a handoff: if the chain dies mid-catch-up the
     * dispatcher picks the topic back up once this expires, so a lost job costs
     * a delay rather than a topic that stops syncing. The chain's own next page
     * overwrites this within ~100 ms while it is healthy.
     *
     * Only meaningful in `dispatcher` mode — see recordNextPoll for why the
     * chain-mode write is skipped.
     */
    private async parkFromDispatcher(topicId: string): Promise<void> {
        if (this.pollMode !== 'dispatcher') return;
        const seconds = Math.max(60, Math.round(this.pollDelay / 1000));
        await this.dataSource.query(
            `UPDATE topic_cache
                SET "nextPollAt"      = now() + ($2::int * interval '1 second'),
                    "pollIntervalSec" = $2::int
              WHERE "topicId" = $1`,
            [topicId, seconds],
        );
    }

    /**
     * Resolves the sequence number this sync should actually start from.
     *
     * The cursor of record is topic_cache.messages, but producers carry their
     * own idea of it in job data, and several deliberately pass 0 to mean
     * "resume from wherever this topic already is" — guardian-sync does it for
     * every event it routes, and topic discovery does it for newly-seen topics.
     * Taken literally, a 0 drops the mirror-node `sequencenumber=gt:` filter and
     * re-pages the entire topic from sequence 1, re-inserting every message and
     * re-enqueuing a parse job for each one. On a busy Guardian instance firing
     * events every few seconds that is the bulk of the ingestion load.
     *
     * Clamping to the persisted watermark makes those enqueues cheap head-polls
     * and makes a duplicated job idempotent rather than harmful. To force a
     * genuine re-crawl, reset the persisted watermark — which is exactly what
     * the admin requeue endpoint's `fromStart` flag does.
     */
    private async resolveFromSequence(topicId: string, requested: number): Promise<number> {
        const rows: Array<{ messages: number | string }> = await this.dataSource.query(
            `SELECT messages FROM topic_cache WHERE "topicId" = $1 LIMIT 1`,
            [topicId],
        );
        const watermark = Number(rows[0]?.messages ?? 0);
        return Math.max(requested || 0, Number.isFinite(watermark) ? watermark : 0);
    }

    /**
     * Batch inserts messages into message_cache using a single query
     * wrapped in a transaction for atomicity.
     */
    private async batchInsertMessages(
        messages: TopicMessage[],
        topicId: string,
        now: string,
    ): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Build a single multi-row INSERT with unnest for batch efficiency
            const timestamps: string[] = [];
            const topicIds: string[] = [];
            const bodies: string[] = [];
            const seqNums: number[] = [];
            const chunkIds: (string | null)[] = [];
            const chunkNums: (number | null)[] = [];
            const chunkTotals: (number | null)[] = [];

            for (const msg of messages) {
                timestamps.push(msg.consensus_timestamp);
                topicIds.push(topicId);
                bodies.push(msg.message);
                seqNums.push(msg.sequence_number);

                const rawChunkId = msg.chunk_info?.initial_transaction_id;
                chunkIds.push(
                    rawChunkId
                        ? (typeof rawChunkId === 'string' ? rawChunkId : JSON.stringify(rawChunkId))
                        : null,
                );
                chunkNums.push(msg.chunk_info?.number ?? null);
                chunkTotals.push(msg.chunk_info?.total ?? null);
            }

            await queryRunner.query(
                `INSERT INTO message_cache (
                    "consensusTimestamp", "topicId", status, "lastUpdate",
                    message, "sequenceNumber", owner,
                    "chunkId", "chunkNumber", "chunkTotal"
                )
                SELECT
                    unnest($1::text[]),
                    unnest($2::text[]),
                    'LOADED',
                    $3,
                    unnest($4::text[]),
                    unnest($5::int[]),
                    NULL,
                    unnest($6::text[]),
                    unnest($7::int[]),
                    unnest($8::int[])
                ON CONFLICT ("consensusTimestamp") DO UPDATE SET
                    message = EXCLUDED.message,
                    status = 'LOADED',
                    "lastUpdate" = EXCLUDED."lastUpdate"`,
                [timestamps, topicIds, now, bodies, seqNums, chunkIds, chunkNums, chunkTotals],
            );

            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<TopicSyncJobData>, error: Error): void {
        this.logger.error(
            `Topic sync job ${job.id} failed for topic ${job.data.topicId}: ${error.message}`,
            error.stack,
        );
    }
}
