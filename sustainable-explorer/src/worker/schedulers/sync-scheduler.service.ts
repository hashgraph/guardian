import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES, getWorkerNetwork } from '@shared/config/bullmq.config';
import { PolicySchemaImportJobData } from '../processors/policy-schema-import.processor';

/**
 * Orchestrates initial sync jobs on startup.
 * Uses Redict-based leader election (scoped per network) so only one instance
 * per network schedules repeating jobs when running multiple workers horizontally.
 */
@Injectable()
export class SyncSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SyncSchedulerService.name);
    private readonly instanceId = `worker-${process.pid}-${Date.now()}`;
    private readonly network = getWorkerNetwork();
    private readonly leaderKey = `se:scheduler:leader:${this.network}`;
    private leaderInterval: ReturnType<typeof setInterval> | null = null;
    private isLeader = false;

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @Inject('REDICT_PUB') private readonly redis: Redis,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
        @InjectQueue(QUEUE_NAMES.MV_REFRESH) private readonly mvRefreshQueue: Queue,
        @InjectQueue(QUEUE_NAMES.BUSINESS_VIEW_BUILD) private readonly businessViewQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_SCHEMA_IMPORT) private readonly policySchemaQueue: Queue,
    ) {}

    async onModuleInit(): Promise<void> {
        this.logger.log(`Scheduler starting (instance: ${this.instanceId})`);

        // Try to acquire leadership
        this.isLeader = await this.tryAcquireLeader();

        if (this.isLeader) {
            this.logger.log('Acquired scheduler leadership — scheduling jobs');
            await this.scheduleAllJobs();
        } else {
            this.logger.log('Another instance is leader — skipping repeating job scheduling');
        }

        // Seed root topic if topic_cache is empty (fresh system bootstrap)
        await this.seedRootTopicIfEmpty();

        // Always schedule initial topic/token syncs (idempotent via jobId)
        await this.scheduleTopicSyncs();
        await this.scheduleTokenSyncs();
        await this.schedulePolicySchemaImports();

        // Renew leadership periodically
        this.leaderInterval = setInterval(async () => {
            try {
                this.isLeader = await this.tryAcquireLeader();
                if (this.isLeader) {
                    await this.redis.expire(this.leaderKey, 30);
                }
            } catch {
                // Silent — will retry next interval
            }
        }, 15000);
    }

    onModuleDestroy(): void {
        if (this.leaderInterval) {
            clearInterval(this.leaderInterval);
            this.leaderInterval = null;
        }
        // Release leadership
        if (this.isLeader) {
            this.redis.del(this.leaderKey).catch(() => {});
        }
    }

    /**
     * Tries to acquire a distributed lock for scheduler leadership.
     * Lock TTL is 30s, renewed every 15s by the leader.
     */
    private async tryAcquireLeader(): Promise<boolean> {
        const result = await this.redis.set(
            this.leaderKey,
            this.instanceId,
            'EX', 30,
            'NX',
        );
        if (result === 'OK') return true;

        // Check if we already hold the lock
        const current = await this.redis.get(this.leaderKey);
        return current === this.instanceId;
    }

    /**
     * Default root topic IDs per Hedera network.
     * These are the Guardian Standard Registry announcement topics.
     *
     * | Network    | Topic ID    |
     * |------------|-------------|
     * | Mainnet    | 0.0.1368856 |
     * | Testnet    | 0.0.1960    |
     * | Previewnet | 0.0.10071   |
     */
    private static readonly ROOT_TOPICS: Record<string, string> = {
        mainnet: '0.0.1368856',
        testnet: '0.0.1960',
        previewnet: '0.0.10071',
    };

    /**
     * Ensures the root topic for the current network exists in topic_cache.
     * This bootstraps a fresh system and is also a safety net for cases where
     * the cache has other topics but not the root (partial seed, manual edit, etc.).
     * Once the root topic is synced, child topics are discovered recursively
     * from message content.
     */
    private async seedRootTopicIfEmpty(): Promise<void> {
        const network = this.configService.get<string>('app.hedera.network') || 'testnet';
        const seedTopicId = this.configService.get<string>('app.seedTopicId')
            || SyncSchedulerService.ROOT_TOPICS[network];

        if (!seedTopicId) {
            this.logger.warn(`No seed topic ID for network "${network}" — cannot bootstrap`);
            return;
        }

        // Check for the specific root topic (not just any row in the cache)
        const rows = await this.dataSource.query(
            `SELECT 1 FROM topic_cache WHERE "topicId" = $1 LIMIT 1`,
            [seedTopicId],
        );

        if (rows.length > 0) {
            this.logger.debug(`Root topic ${seedTopicId} already seeded for ${network}`);
            return;
        }

        await this.dataSource.query(
            `INSERT INTO topic_cache ("topicId", status, messages, "hasNext", "lastUpdate")
             VALUES ($1, 'NEW', 0, true, $2)
             ON CONFLICT ("topicId") DO NOTHING`,
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

        let enqueued = 0;
        for (const topic of topics) {
            // Use watermark + timestamp in jobId so restarts always create a fresh job
            // (BullMQ deduplicates stale job IDs from previous runs)
            const fromSeq = topic.messages || 0;
            await this.topicQueue.add('sync', {
                topicId: topic.topicId,
                fromSequenceNumber: fromSeq,
                isOrgTopic: false,
            }, {
                jobId: `topic-${topic.topicId}-${fromSeq}-${Date.now()}`,
            });
            enqueued++;
        }

        this.logger.log(`Enqueued ${enqueued} topic sync jobs from cache`);
    }

    /**
     * Reads token_cache where hasNext=true and creates token-sync jobs.
     * Safe to run on multiple instances — jobId prevents duplicates.
     */
    private async scheduleTokenSyncs(): Promise<void> {
        const tokens = await this.dataSource.query(
            `SELECT "tokenId", "serialNumber" FROM token_cache WHERE "hasNext" = true`,
        );

        for (const token of tokens) {
            await this.tokenQueue.add('sync', {
                tokenId: token.tokenId,
                fetchNfts: true,
                fromSerial: token.serialNumber || 0,
            }, {
                jobId: `token-${token.tokenId}-init`,
            });
        }

        this.logger.log(`Enqueued ${tokens.length} token sync jobs from cache`);
    }

    /**
     * Finds Instance-Policy messages that have a ZIP CID but no imported schemas
     * and re-enqueues them for the PolicySchemaImportProcessor.
     *
     * The processor itself deduplicates via (policyTopicId, sourceCid), so
     * already-imported ZIPs are skipped cheaply on subsequent restarts.
     */
    private async schedulePolicySchemaImports(): Promise<void> {
        const rows: Array<{ policy_topic_id: string; consensus_timestamp: string; cid: string }> =
            await this.dataSource.query(`
                SELECT
                    m."topicId"            AS policy_topic_id,
                    m."consensusTimestamp" AS consensus_timestamp,
                    f.cid
                FROM message m
                CROSS JOIN LATERAL UNNEST(m.files) AS f(cid)
                WHERE m.type = 'Instance-Policy'
                  AND m.action ILIKE 'publish-policy'
                  AND m.files IS NOT NULL
                  AND array_length(m.files, 1) > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM policy_schema ps
                      WHERE ps."policyTopicId" = m."topicId"
                        AND ps."sourceCid" = f.cid
                  )
            `);

        for (const row of rows) {
            const jobData: PolicySchemaImportJobData = {
                cid: row.cid,
                messageTimestamp: row.consensus_timestamp,
                policyTopicId: row.policy_topic_id,
            };
            // Timestamp suffix ensures a fresh job even if an old completed/failed
            // job with the same logical ID exists in BullMQ history.
            await this.policySchemaQueue.add('import', jobData, {
                jobId: `policy-schema-${row.policy_topic_id}-${row.cid}-${Date.now()}`,
            });
        }

        this.logger.log(`Enqueued ${rows.length} missing policy schema import job(s)`);
    }

    private async scheduleMvRefresh(): Promise<void> {
        const mvRefreshInterval = this.configService.get<number>('app.mvRefreshInterval')! * 1000;

        const repeatableJobs = await this.mvRefreshQueue.getRepeatableJobs();
        for (const rJob of repeatableJobs) {
            await this.mvRefreshQueue.removeRepeatableByKey(rJob.key);
        }

        await this.mvRefreshQueue.add('refresh-mvs', {}, {
            repeat: { every: mvRefreshInterval },
            jobId: 'mv-refresh',
        });

        this.logger.log(`Scheduled MV refresh every ${mvRefreshInterval / 1000}s`);
    }

    private async scheduleBusinessViewBuilder(): Promise<void> {
        const interval = 5 * 60 * 1000;

        const repeatableJobs = await this.businessViewQueue.getRepeatableJobs();
        for (const rJob of repeatableJobs) {
            await this.businessViewQueue.removeRepeatableByKey(rJob.key);
        }

        await this.businessViewQueue.add('build-business-views', {}, {
            repeat: { every: interval },
            jobId: 'business-view-build',
        });

        this.logger.log('Scheduled business view builder every 5 minutes');
    }
}
