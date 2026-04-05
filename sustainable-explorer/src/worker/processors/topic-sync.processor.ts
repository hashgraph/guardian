import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { HederaService, TopicMessage } from '../services/hedera.service';

export interface TopicSyncJobData {
    topicId: string;
    fromSequenceNumber: number;
    isOrgTopic: boolean;
}

@Processor(QUEUE_NAMES.TOPIC_SYNC)
export class TopicSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(TopicSyncProcessor.name);

    constructor(
        private readonly hederaService: HederaService,
        private readonly dataSource: DataSource,
        @InjectQueue(QUEUE_NAMES.MESSAGE_PARSE) private readonly messageQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<TopicSyncJobData>): Promise<void> {
        const { topicId, fromSequenceNumber, isOrgTopic } = job.data;

        this.logger.log(`Syncing topic ${topicId} from seq ${fromSequenceNumber}`);

        const { messages } = await this.hederaService.getMessages(topicId, fromSequenceNumber);

        if (messages.length === 0) {
            this.logger.debug(`No new messages for topic ${topicId}`);
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
                },
            })),
        );

        // 3. Update watermark LAST — if we crash before here,
        //    the watermark stays at the old value and messages
        //    will be re-fetched on restart (idempotent via ON CONFLICT)
        await this.dataSource.query(
            `UPDATE topic_cache
             SET messages = $1, "hasNext" = $2, "lastUpdate" = $3, status = 'SYNCED'
             WHERE "topicId" = $4`,
            [maxSequence, hasNext, now, topicId],
        );

        // 4. Self-enqueue for next page if full page received
        if (hasNext) {
            await this.topicQueue.add('sync', {
                topicId,
                fromSequenceNumber: maxSequence,
                isOrgTopic,
            }, {
                jobId: `topic-${topicId}-${maxSequence}`,
                delay: 100,
            });
        }

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
