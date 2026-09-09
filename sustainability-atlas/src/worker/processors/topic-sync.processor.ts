import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { HederaService, TopicMessage } from '../services/hedera.service';
import { isTopicBlocked } from '@shared/config/topic-blocklist';

export interface TopicSyncJobData {
    topicId: string;
    fromSequenceNumber: number;
    isOrgTopic: boolean;
}

@Processor(QUEUE_NAMES.TOPIC_SYNC)
export class TopicSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(TopicSyncProcessor.name);
    private readonly pollDelay: number;
    private readonly orgPollDelay: number;

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
    }

    async process(job: Job<TopicSyncJobData>): Promise<void> {
        const { topicId, fromSequenceNumber, isOrgTopic } = job.data;

        if (isTopicBlocked(topicId)) {
            this.logger.debug(`Topic ${topicId} is blocklisted — skipping sync`);
            return;
        }

        this.logger.log(`Syncing topic ${topicId} from seq ${fromSequenceNumber}`);

        const { messages } = await this.hederaService.getMessages(topicId, fromSequenceNumber);

        if (messages.length === 0) {
            // No new messages — re-enqueue with a delay to keep polling.
            // Uses timestamp in jobId so each poll creates a fresh job
            // (BullMQ dedupes completed/stale jobIds).
            const delay = isOrgTopic ? this.orgPollDelay : this.pollDelay;
            await this.topicQueue.add('sync', {
                topicId,
                fromSequenceNumber,
                isOrgTopic,
            }, {
                jobId: `topic-${topicId}-poll-${Date.now()}`,
                delay,
                // Each poll is a uniquely-named keep-alive job; without these the
                // completed/failed sets grow unbounded and eventually OOM Redict.
                removeOnComplete: true,
                removeOnFail: 1000,
            });
            this.logger.debug(`No new messages for topic ${topicId}, re-polling in ${delay}ms`);
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

        // 4. Self-enqueue for next page.
        //    - If full page received: immediate next page (catching up)
        //    - If partial page: delayed re-poll (caught up, waiting for new messages)
        const nextDelay = hasNext ? 100 : (isOrgTopic ? this.orgPollDelay : this.pollDelay);
        await this.topicQueue.add('sync', {
            topicId,
            fromSequenceNumber: maxSequence,
            isOrgTopic,
        }, {
            jobId: `topic-${topicId}-${maxSequence}-${Date.now()}`,
            delay: nextDelay,
            // Uniquely-named per page/watermark — trim on finish so they don't
            // accumulate in the completed/failed sets and exhaust Redict memory.
            removeOnComplete: true,
            removeOnFail: 1000,
        });

        this.logger.log(
            `Topic ${topicId}: ${messages.length} messages, maxSeq=${maxSequence}, hasNext=${hasNext}`,
        );
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
