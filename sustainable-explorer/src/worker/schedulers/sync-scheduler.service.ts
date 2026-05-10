import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES, getWorkerNetwork } from '@shared/config/bullmq.config';
import { PolicyDecodeJobData } from '../processors/policy-decode.processor';
import { ProjectMapperService } from '../services/project-mapper.service';

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
        private readonly projectMapperService: ProjectMapperService,
        @Inject('REDICT_PUB') private readonly redis: Redis,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
        @InjectQueue(QUEUE_NAMES.MV_REFRESH) private readonly mvRefreshQueue: Queue,
        @InjectQueue(QUEUE_NAMES.BUSINESS_VIEW_BUILD) private readonly businessViewQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_DECODE) private readonly policyDecodeQueue: Queue,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
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

        // Always seed the root topic (idempotent upsert — resets hasNext to true
        // so a restart will resume crawling even if the topic was previously exhausted).
        await this.seedRootTopic();

        // Always schedule initial topic/token syncs (idempotent via jobId)
        await this.scheduleTopicSyncs();
        await this.scheduleTokenSyncs();
        await this.schedulePolicyDecodeJobs();

        // Backfill IPFS fetches for VCs whose parent policy is now decoded but whose
        // fetch was skipped (they arrived before their policy was decoded).
        await this.backfillSuccessfulPolicyVcFetches();

        // Re-run eager project mapping for already-fetched VCs that don't have a
        // PROJECT row yet. Covers worker restarts and pre-eager-path data.
        // await this.backfillProjectMappings();

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
     * Idempotent upsert of the root topic into topic_cache.
     * Always runs on startup — resets hasNext=true so a restart resumes crawling
     * even if the topic was previously marked exhausted.
     */
    private async seedRootTopic(): Promise<void> {
        const network = this.configService.get<string>('app.hedera.network') || 'testnet';
        const seedTopicId = this.configService.get<string>('app.seedTopicId')
            || SyncSchedulerService.ROOT_TOPICS[network];

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
     * Reads token_cache and creates token-sync jobs.
     *
     * - Tokens with hasNext=true are synced from their watermark to pick up new serials.
     * - All NFT tokens are also re-synced from serial 0 so that any retirements
     *   (deleted=true in nft_cache) that occurred since the last sync are detected.
     */
    private async scheduleTokenSyncs(): Promise<void> {
        const pendingTokens = await this.dataSource.query(
            `SELECT "tokenId", "serialNumber" FROM token_cache WHERE "hasNext" = true`,
        );
        for (const token of pendingTokens) {
            await this.tokenQueue.add('sync', {
                tokenId: token.tokenId,
                fetchNfts: true,
                fromSerial: token.serialNumber || 0,
            }, {
                jobId: `token-${token.tokenId}-init`,
            });
        }

        // Re-sync all NFT tokens from serial 0 to detect retirements.
        const nftTokens = await this.dataSource.query(
            `SELECT "tokenId" FROM token_cache WHERE type = 'NON_FUNGIBLE_UNIQUE'`,
        );
        for (const token of nftTokens) {
            await this.tokenQueue.add('sync', {
                tokenId: token.tokenId,
                fetchNfts: true,
                fromSerial: 0,
            }, {
                jobId: `token-${token.tokenId}-retirement-${Date.now()}`,
            });
        }

        this.logger.log(
            `Enqueued ${pendingTokens.length} incremental token sync(s), ` +
            `${nftTokens.length} NFT retirement check(s)`,
        );
    }

    /**
     * Finds Instance-Policy messages that have a ZIP CID but no imported schemas
     * and re-enqueues them for the PolicyDecodeProcessor.
     *
     * The processor itself deduplicates via (policyTopicId, sourceCid), so
     * already-imported ZIPs are skipped cheaply on subsequent restarts.
     */
    private async schedulePolicyDecodeJobs(): Promise<void> {
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
                  AND (
                      NOT EXISTS (
                          SELECT 1 FROM policy_schema ps
                          WHERE ps."policyTopicId" = m."topicId"
                            AND ps."sourceCid" = f.cid
                      )
                      OR EXISTS (
                          SELECT 1 FROM business_view bv
                          WHERE bv."viewType" = 'METHODOLOGY'
                            AND bv."businessData"->>'topicId' = m."topicId"
                            AND bv."businessData"->'sectoralScopes' IS NULL
                            AND bv."businessData"->'emissionReductionApproach' IS NULL
                      )
                  )
            `);

        for (const row of rows) {
            const jobData: PolicyDecodeJobData = {
                cid: row.cid,
                messageTimestamp: row.consensus_timestamp,
                policyTopicId: row.policy_topic_id,
            };
            // Timestamp suffix ensures a fresh job even if an old completed/failed
            // job with the same logical ID exists in BullMQ history.
            await this.policyDecodeQueue.add('decode', jobData, {
                jobId: `policy-decode-${row.policy_topic_id}-${row.cid}-${Date.now()}`,
            });
        }

        this.logger.log(`Enqueued ${rows.length} missing policy decode job(s)`);
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
        const policies: Array<{ policyTopicId: string }> = await this.dataSource.query(
            `SELECT "policyTopicId" FROM policy_decode_status WHERE status = 'success'`,
        );

        let total = 0;
        for (const policy of policies) {
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
                     SELECT m."consensusTimestamp", unnest(m.files) AS cid
                     FROM message m
                     JOIN descendants d ON d."topicId" = m."topicId"
                     WHERE m.type = 'VC-Document'
                       AND m.documents IS NULL
                       AND m.files IS NOT NULL`,
                    [policy.policyTopicId],
                );

            for (const row of rows) {
                await this.ipfsQueue.add(
                    'fetch',
                    { cid: row.cid, messageTimestamp: row.consensusTimestamp },
                    { jobId: `ipfs-${row.cid}` },
                );
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
        // 60-minute cadence: registry/methodology/credit upserts still run here,
        // but project mapping is now primarily handled by eager per-VC upserts in
        // IpfsFetchProcessor. This batch job is the reconciliation/cleanup pass.
        const interval = 2 * 60 * 1000;

        const repeatableJobs = await this.businessViewQueue.getRepeatableJobs();
        for (const rJob of repeatableJobs) {
            await this.businessViewQueue.removeRepeatableByKey(rJob.key);
        }

        // Immediate one-shot so registries/methodologies/credits populate within
        // seconds of boot rather than waiting a full hour for the first repeat fire.
        await this.businessViewQueue.add('build-business-views', {}, {
            jobId: `business-view-build-initial-${Date.now()}`,
        });

        await this.businessViewQueue.add('build-business-views', {}, {
            repeat: { every: interval },
            jobId: 'business-view-build',
        });

        this.logger.log('Scheduled business view builder: initial run + every 60 minutes');
    }
}
