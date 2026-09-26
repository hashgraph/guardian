import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    Sse,
    HttpCode,
    HttpStatus,
    ConflictException,
    HttpException,
    NotFoundException,
    Logger,
    MessageEvent,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiBody,
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import { AdminWrite, AdminRead } from '../auth/decorators/admin-write.decorator';
import { Job } from 'bullmq';
import { Observable } from 'rxjs';
import { IsBoolean, IsInt, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import CID from 'cids';
import { BASE_QUEUE_NAMES } from '@shared/config/bullmq.config';
import { getHeadroom, canEnqueueBulk } from '@shared/redis/redis-headroom';
import { QueueRegistry } from '../queues/queue.registry';
import { QueueEventsBus } from '../queues/queue-events-bus.service';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import {
    QueueStatusItemDto,
    JobCountsDto,
    QueueConfigDto,
    FailedJobDto,
    FailedJobListDto,
    FailedJobGroupDto,
    FailedJobGroupListDto,
    RetryJobBodyDto,
    RetryAllFailedBodyDto,
    RetryAllFailedResultDto,
    SyncStatusDto,
    SyncTopicsPageDto,
    SyncTokensPageDto,
    TopicSyncItemDto,
    TokenSyncItemDto,
} from '../dto/queue.dto';

// ---------------------------------------------------------------------------
// Inline query DTOs (simple enough not to warrant separate DTO files)
// ---------------------------------------------------------------------------

class FailedJobsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    limit?: number = 50;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;

    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === '1')
    @IsBoolean()
    groupByReason?: boolean = false;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    groupPage?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    groupPageSize?: number = 10;
}

class SyncTopicsQueryDto {
    @IsOptional()
    @IsString()
    search?: string = '';

    @IsOptional()
    @IsString()
    @IsIn(['NEW', 'SYNCED', 'DISABLED'])
    status?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 10;
}

class SyncTokensQueryDto {
    @IsOptional()
    @IsString()
    search?: string = '';

    @IsOptional()
    @IsString()
    @IsIn(['FUNGIBLE_COMMON', 'NON_FUNGIBLE_UNIQUE'])
    type?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 10;
}

class IpfsStatusQueryDto {
    @IsOptional()
    @IsString()
    topicId?: string;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    includeChildTopics?: boolean;

    /** Bypass the short-lived server-side cache for this request (read-policy
     * flag, not a filter — deliberately excluded from the cache key). */
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    fresh?: boolean;

    @IsOptional()
    @IsString()
    messageType?: string;

    @IsOptional()
    @IsString()
    cid?: string;

    @IsOptional()
    @IsString()
    @IsIn(['transient', 'permanent', 'unknown'])
    errorCategory?: string;

    @IsOptional()
    @IsString()
    @IsIn(['fetched', 'failed', 'pending'])
    status?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    @IsIn(['lastFailedAt', 'attemptCount', 'firstFailedAt', 'status'])
    sortBy?: string = 'status';

    // Default asc, not desc — see the sortDir comment in listIpfsStatus for why:
    // 'pending' (the overwhelming majority of rows) sorts alphabetically after
    // 'failed'/'fetched', so desc forces a full sort through it before LIMIT
    // can apply even with status now indexed. Also better matches the panel's
    // actual intent — failures surfaced first, not the least-actionable bucket.
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortDir?: string = 'asc';
}

class RetryByTopicBodyDto {
    @ApiProperty({ description: 'Hedera topic ID whose IPFS failures should be retried' })
    @IsString()
    topicId: string;

    @ApiPropertyOptional({ description: 'When true, also include descendant (child) topics' })
    @IsOptional()
    @IsBoolean()
    includeChildTopics?: boolean;
}

class CleanQueueBodyDto {
    @ApiPropertyOptional({
        description: 'Which finished set to clean. Only finished jobs are eligible.',
        enum: ['completed', 'failed'],
        default: 'completed',
    })
    @IsOptional()
    @IsString()
    @IsIn(['completed', 'failed'])
    status?: 'completed' | 'failed';

    @ApiPropertyOptional({
        description: 'Only remove jobs finished longer ago than this, in ms.',
        default: 3600000,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    graceMs?: number;

    @ApiPropertyOptional({ description: 'Maximum jobs removed per call.', default: 5000 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50000)
    limit?: number;
}

class RequeueTopicBodyDto {
    @ApiProperty({ description: 'Hedera topic ID to enqueue for sync (e.g. 0.0.43065)' })
    @IsString()
    topicId: string;

    @ApiPropertyOptional({
        description: 'When true, restart from sequence 0 (re-process all messages). ' +
            'When false (default), resume from the current watermark.',
    })
    @IsOptional()
    @IsBoolean()
    fromStart?: boolean;
}

class IpfsCidStatusDto {
    @ApiProperty({ description: 'IPFS content identifier (CID)' })
    cid: string;

    @ApiProperty({ description: 'CIDv1 base32 form (bafy...)' })
    cidV1: string;

    @ApiPropertyOptional({ description: 'Hedera topic ID of the linked message', nullable: true })
    topicId: string | null;

    @ApiPropertyOptional({ description: 'Message type from the linked message row', nullable: true })
    messageType: string | null;

    @ApiProperty({ description: 'Fetch status', enum: ['fetched', 'failed', 'pending'] })
    status: string;

    @ApiPropertyOptional({ description: 'Last error message recorded for this CID', nullable: true })
    lastError: string | null;

    @ApiPropertyOptional({
        description: 'Error category',
        enum: ['transient', 'permanent', 'unknown'],
        nullable: true,
    })
    errorCategory: string | null;

    @ApiPropertyOptional({ description: 'Total number of automatic fetch attempts made', nullable: true })
    attemptCount: number | null;

    @ApiPropertyOptional({ description: 'Number of times an operator manually triggered a retry', nullable: true })
    manualRetryCount: number | null;

    @ApiPropertyOptional({ description: 'ISO timestamp of the first recorded failure', nullable: true })
    firstFailedAt: string | null;

    @ApiPropertyOptional({ description: 'ISO timestamp of the most recent failure', nullable: true })
    lastFailedAt: string | null;
}

class IpfsCidStatusMetaDto {
    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Items per page' })
    limit: number;

    @ApiProperty({ description: 'Total matching records' })
    total: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;
}

class IpfsCidStatusListDto {
    @ApiProperty({ type: [IpfsCidStatusDto] })
    data: IpfsCidStatusDto[];

    @ApiProperty({ type: IpfsCidStatusMetaDto })
    meta: IpfsCidStatusMetaDto;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/** Failed jobs hydrated per round-trip — see retryAllFailed. */
const FAILED_FETCH_CHUNK = 100;
/** Ceiling on CIDs re-queued by one retry-by-topic call. */
const RETRY_BY_TOPIC_MAX = 2000;
/** TTL for the cached /queues counts snapshot. */
const QUEUE_COUNTS_TTL_MS = 5_000;
/** Newest failed jobs scanned when grouping by reason (public endpoint). */
const GROUP_SCAN_MAX = 2000;
/** TTL for the cached /ipfs-status page. */
const IPFS_STATUS_TTL_MS = 15_000;
/** Ceiling on distinct cached /ipfs-status filter combinations — topicId is free-text
 * (unbounded cardinality), so without a cap a crawler could grow this Map forever. */
const IPFS_STATUS_CACHE_MAX_ENTRIES = 200;

// The sync-status page is VIEWABLE by everyone (read-only): all GET/SSE endpoints
// here are PUBLIC so guests/users can see queue + sync + IPFS status. Only the
// state-changing ACTIONS (retry / requeue / ipfs-retry POSTs) are admin-gated via
// @AdminWrite. (The Guardian-sync data is separately admin-only — see
// guardian-sync.controller.) Read-vs-write is the access axis here.
@ApiTags('Data pipeline')
@Controller('api/v1')
export class QueueStatusController {
    private readonly logger = new Logger(QueueStatusController.name);

    // The public sync-status summary is hit on EVERY page load (sidebar "last
    // synced" indicator) and runs a full aggregate over topic_cache. It changes
    // slowly, so cache the aggregate per-network for a few seconds (lag is still
    // recomputed live each call). Eliminates the per-page DB scan for all users.
    private static readonly SYNC_STATUS_TTL_MS = 15_000;
    private readonly syncStatusCache = new Map<
        string,
        { maxSeconds: number | null; totalTopics: number; syncedTopics: number; totalMessages: number; expiresAt: number }
    >();

    /** Short-lived /queues snapshot per network — see listQueues. */
    private readonly queueCountsCache = new Map<
        string,
        { items: QueueStatusItemDto[]; expiresAt: number }
    >();

    /** Short-lived /ipfs-status page snapshot per network+filter — see listIpfsStatus. */
    private readonly ipfsStatusCache = new Map<
        string,
        { payload: IpfsCidStatusListDto; expiresAt: number }
    >();

    /** Last successfully computed total per totalCacheKey (filters only — NOT
     * page/limit/sortBy/sortDir, which don't affect the total), kept
     * indefinitely (capped by size, not TTL) — see the countSql fallback in
     * listIpfsStatus. The count query has no filter to prune the common
     * (unfiltered) case, so its
     * cost is tied to message_ipfs_cid's full size regardless of how cheap the
     * data query is; under real concurrent load on this database (background
     * materialized-view refreshes, business_view rebuilds) it can occasionally
     * miss the statement_timeout even when the row data comes back fine. A
     * slightly-stale total on the pagination footer is a far smaller problem
     * than failing the whole panel over a number nobody is watching that
     * closely. */
    private readonly ipfsStatusTotalCache = new Map<string, number>();

    constructor(
        private readonly queueRegistry: QueueRegistry,
        private readonly queueEventsBus: QueueEventsBus,
        private readonly dataSources: NetworkDataSourceRegistry,
    ) {}

    // -------------------------------------------------------------------------
    // SSE — MUST be declared first to avoid `:baseName` wildcard conflicts
    // -------------------------------------------------------------------------

    /**
     * GET /:network/queues/events
     * Server-Sent Events stream — emits real-time queue status updates.
     */
    @Sse(':network/queues/events')
    @ApiOperation({
        summary: 'Get live updates on the processing queues',
        description:
            'Streams job lifecycle events (completed, failed, active, waiting, stalled), ' +
            'debounced counts-changed snapshots, se:events pub/sub messages, ' +
            'and a heartbeat every 25 s. Connect with EventSource on the client.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, description: 'SSE stream established' })
    streamQueueEvents(@Param('network') network: string): Observable<MessageEvent> {
        // Actually validate the network. The previous call discarded its own
        // result, so any string opened a stream — and now that streams are
        // created on demand, an unknown network would also register subscriber
        // bookkeeping for a network that does not exist.
        const configured = this.queueRegistry.getConfiguredNetworks();
        if (!configured.includes(network.toLowerCase())) {
            throw new HttpException(
                `Network "${network}" is not configured on this API instance. ` +
                `Available: ${configured.join(', ')}.`,
                HttpStatus.NOT_FOUND,
            );
        }
        return this.queueEventsBus.streamForNetwork(network);
    }

    // -------------------------------------------------------------------------
    // GET /:network/queues/redis-health — memory + connection pressure
    // -------------------------------------------------------------------------

    /**
     * The metric that predicts the failure mode operators actually hit: Redict
     * runs `noeviction`, so at maxmemory it starts refusing writes and job
     * production fails outright rather than degrading. Watching this alongside
     * pending depth gives warning before that point.
     */
    @Get(':network/queues/redis-health')
    @AdminRead()
    @ApiOperation({
        summary: 'Check queue storage health (memory and connections)',
        description:
            'One INFO call, cached briefly. Reports memory used against maxmemory, ' +
            'the configured eviction policy, and connected client count.',
    })
    @ApiResponse({ status: 200, description: 'Current Redis pressure' })
    async redisHealth(): Promise<{
        usedBytes: number;
        maxBytes: number;
        usedPercent: number | null;
        healthy: boolean;
        maxmemoryPolicy: string | null;
        connectedClients: number | null;
    }> {
        const connection = this.queueRegistry.getConnection();
        const headroom = await getHeadroom(connection);

        let maxmemoryPolicy: string | null = null;
        let connectedClients: number | null = null;
        try {
            const info = await connection.info('memory');
            maxmemoryPolicy = /^maxmemory_policy:(.*)$/m.exec(info)?.[1]?.trim() ?? null;
            const clients = await connection.info('clients');
            const parsed = /^connected_clients:(\d+)$/m.exec(clients)?.[1];
            connectedClients = parsed ? parseInt(parsed, 10) : null;
        } catch {
            // Diagnostics only — report what was readable.
        }

        return {
            usedBytes: headroom.usedBytes,
            maxBytes: headroom.maxBytes,
            usedPercent: headroom.maxBytes > 0
                ? Number((headroom.usedFraction * 100).toFixed(2))
                : null,
            healthy: headroom.ok,
            maxmemoryPolicy,
            connectedClients,
        };
    }

    // -------------------------------------------------------------------------
    // GET /:network/queues — list all queues with counts
    // -------------------------------------------------------------------------

    @Get(':network/queues')
    @ApiOperation({
        summary: 'List the processing queues with job counts',
        description:
            'Returns one entry per base queue name.  Counts are fetched live from ' +
            'BullMQ/Redis on every call, with no caching.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: [QueueStatusItemDto] })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async listQueues(@Param('network') network: string): Promise<QueueStatusItemDto[]> {
        const configured = this.queueRegistry.getConfiguredNetworks();
        if (!configured.includes(network.toLowerCase())) {
            throw new NotFoundException(
                `Network "${network}" is not configured. Available: ${configured.join(', ')}`,
            );
        }

        // This endpoint is public and costs ~7 Redis commands per queue, so an
        // auto-refreshing dashboard (or a crawler) turns it into steady load on a
        // half-a-core Redict. A few seconds of staleness is invisible on a page
        // that is already event-driven over SSE.
        const cached = this.queueCountsCache.get(network);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.items;
        }

        const baseNames = this.queueRegistry.listBaseNames();
        const items: QueueStatusItemDto[] = [];

        for (const base of baseNames) {
            try {
                const queue = this.queueRegistry.getQueue(network, base);
                const qConfig = this.queueRegistry.getQueueConfig(network, base);
                const [rawCounts, isPaused] = await Promise.all([
                    queue.getJobCounts(
                        'waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'prioritized',
                    ),
                    queue.isPaused(),
                ]);

                // 'prioritized' is reported separately because BullMQ keeps
                // priority-carrying jobs in their own structure: 'waiting' counts
                // only the plain wait list, so a queue whose producers all set a
                // priority reads as empty here no matter how deep it is. Showing
                // just `waiting` hid a ~1M-job backlog from operators.
                const counts: JobCountsDto = {
                    waiting: rawCounts['waiting'] ?? 0,
                    active: rawCounts['active'] ?? 0,
                    completed: rawCounts['completed'] ?? 0,
                    failed: rawCounts['failed'] ?? 0,
                    delayed: rawCounts['delayed'] ?? 0,
                    paused: rawCounts['paused'] ?? 0,
                    prioritized: rawCounts['prioritized'] ?? 0,
                };

                const config: QueueConfigDto = qConfig
                    ? {
                          concurrency: qConfig.concurrency,
                          attempts: qConfig.defaultJobOptions.attempts,
                          backoffType: qConfig.defaultJobOptions.backoff.type,
                          backoffDelay: qConfig.defaultJobOptions.backoff.delay,
                      }
                    : { concurrency: 0, attempts: 0, backoffType: 'unknown', backoffDelay: 0 };

                const fullName = queue.name;

                items.push({ baseName: base, fullName, counts, config, isPaused });
            } catch (error: unknown) {
                if (error instanceof NotFoundException) throw error;
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to fetch queue info for ${network}:${base}: ${msg}`);
            }
        }

        this.queueCountsCache.set(network, {
            items,
            expiresAt: Date.now() + QUEUE_COUNTS_TTL_MS,
        });
        return items;
    }

    /** Drops the cached counts for a network after an action that changes them. */
    private invalidateQueueCounts(network: string): void {
        this.queueCountsCache.delete(network);
    }

    // -------------------------------------------------------------------------
    // GET /:network/queues/:baseName/failed — failed job list / grouped
    // -------------------------------------------------------------------------

    @Get(':network/queues/:baseName/failed')
    @ApiOperation({
        summary: 'List failed jobs in a queue',
        description:
            'When groupByReason=false (default): returns a paginated list of failed jobs. ' +
            'When groupByReason=true: returns jobs grouped by their failure reason.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'baseName', description: 'Base queue name, e.g. "mirror-node-topics"' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items to return (default 50)' })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Item offset for pagination (default 0)' })
    @ApiQuery({
        name: 'groupByReason',
        required: false,
        type: Boolean,
        description: 'When true, group results by failure reason',
    })
    @ApiQuery({ name: 'groupPage', required: false, type: Number, description: 'Page number for grouped results (default 1)' })
    @ApiQuery({ name: 'groupPageSize', required: false, type: Number, description: 'Groups per page (default 10, max 100)' })
    @ApiResponse({ status: 200, description: 'Failed job list or grouped summary' })
    @ApiResponse({ status: 404, description: 'Network or queue not found' })
    async getFailedJobs(
        @Param('network') network: string,
        @Param('baseName') baseName: string,
        @Query() query: FailedJobsQueryDto,
    ): Promise<FailedJobListDto | FailedJobGroupListDto> {
        const queue = this.queueRegistry.getQueue(network, baseName);
        const limit = query.limit ?? 50;
        const offset = query.offset ?? 0;
        const groupByReason = query.groupByReason ?? false;

        // Bypasses queue.getFailed() — BullMQ v5 fires one HGETALL per job via
        // Promise.all, saturating the connection on large queues and returning empty.
        // Job IDs are read directly from the failed sorted-set (ZREVRANGE) or list
        // (LRANGE for older BullMQ), then hashes are fetched in batches of 50
        // via a Redis pipeline — one round-trip per batch.
        const client: import('ioredis').Redis = await (queue as any).client;
        const failedKey = queue.toKey('failed');

        const keyType: string = await client.type(failedKey);
        const isZSet = keyType === 'zset';
        const isList = keyType === 'list';

        const total: number = isZSet
            ? await client.zcard(failedKey)
            : isList
                ? await client.llen(failedKey)
                : 0;

        // Get a range of job IDs (newest-first)
        const getIds = async (start: number, end: number): Promise<string[]> => {
            if (!isZSet && !isList) return [];
            return isZSet
                ? client.zrevrange(failedKey, start, end)
                : client.lrange(failedKey, start, end);
        };

        // Fetch job hashes in batches of 50 via pipeline (one round-trip per 50 jobs)
        const fetchJobs = async (ids: string[]): Promise<Job[]> => {
            const PIPE = 50;
            const jobs: Job[] = [];
            for (let i = 0; i < ids.length; i += PIPE) {
                const batchIds = ids.slice(i, i + PIPE);
                const pipeline = client.pipeline();
                batchIds.forEach(id => pipeline.hgetall(queue.toKey(id)));
                const results = ((await pipeline.exec()) ?? []) as Array<[Error | null, Record<string, string> | null]>;
                for (let j = 0; j < results.length; j++) {
                    const [err, data] = results[j];
                    if (!err && data && Object.keys(data).length > 0) {
                        try {
                            jobs.push(Job.fromJSON(queue, data as any, batchIds[j]));
                        } catch {
                            // Corrupt hash — skip silently
                        }
                    }
                }
            }
            return jobs;
        };

        if (groupByReason) {
            // Scan IDs in chunks of 500 then pipeline-fetch their hashes.
            //
            // Bounded by GROUP_SCAN_MAX. This endpoint is public and previously
            // walked the ENTIRE failed set — with removeOnFail counts in the
            // thousands per queue, one unauthenticated request could pull every
            // failed job hash out of Redict, and repeat requests could keep the
            // shared connection busy indefinitely. The newest N failures are what
            // an operator is actually grouping by, so the scan stops there and
            // says so.
            const ID_CHUNK = 500;
            const scanLimit = Math.min(total, GROUP_SCAN_MAX);
            const groupMap = new Map<string, { count: number; sampleJobIds: string[] }>();

            for (let batchStart = 0; batchStart < scanLimit; batchStart += ID_CHUNK) {
                const ids = await getIds(batchStart, Math.min(batchStart + ID_CHUNK - 1, scanLimit - 1));
                if (ids.length === 0) break;

                const jobs = await fetchJobs(ids);
                for (const job of jobs) {
                    const reason = job.failedReason ?? '(unknown)';
                    const entry = groupMap.get(reason) ?? { count: 0, sampleJobIds: [] };
                    entry.count += 1;
                    if (entry.sampleJobIds.length < 5) entry.sampleJobIds.push(job.id ?? '');
                    groupMap.set(reason, entry);
                }
            }

            const allGroups: FailedJobGroupDto[] = Array.from(groupMap.entries()).map(([reason, g]) => ({
                reason,
                count: g.count,
                sampleJobIds: g.sampleJobIds,
            }));

            const groupPageSize = query.groupPageSize ?? 10;
            const groupPage = query.groupPage ?? 1;
            const groupStart = (groupPage - 1) * groupPageSize;
            const groups = allGroups.slice(groupStart, groupStart + groupPageSize);

            return {
                total: allGroups.length,
                page: groupPage,
                pageSize: groupPageSize,
                groups,
            };
        }

        // Regular paginated list
        const ids = await getIds(offset, offset + limit - 1);
        const failedJobs = await fetchJobs(ids);

        const items: FailedJobDto[] = failedJobs.map((job) => ({
            id: job.id ?? '',
            name: job.name,
            data: job.data as unknown,
            failedReason: job.failedReason ?? '',
            stacktrace: (job.stacktrace?.[0] ?? '').split('\n').slice(0, 3),
            attemptsMade: job.attemptsMade,
            manualRetryCount: (job.data as Record<string, unknown> | undefined)?.['manualRetryCount'] as number ?? 0,
            timestamp: job.timestamp,
            processedOn: job.processedOn ?? 0,
            finishedOn: job.finishedOn ?? 0,
        }));

        return { total, items };
    }

    // -------------------------------------------------------------------------
    // POST /:network/queues/:baseName/jobs/:jobId/retry — single job retry
    // -------------------------------------------------------------------------

    @Post(':network/queues/:baseName/jobs/:jobId/retry')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry one failed job',
        description:
            'Loads the job from the queue, validates it is in the failed state, ' +
            'checks the manual retry budget (max 3 unless force=true), ' +
            'increments manualRetryCount in the job data, then re-queues it.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'baseName', description: 'Base queue name' })
    @ApiParam({ name: 'jobId', description: 'BullMQ job ID' })
    @ApiBody({ type: RetryJobBodyDto })
    @ApiResponse({ status: 200, description: 'Job re-queued successfully' })
    @ApiResponse({ status: 404, description: 'Job not found' })
    @ApiResponse({ status: 409, description: 'Job is not in failed state' })
    @ApiResponse({ status: 429, description: 'Manual retry budget exhausted' })
    async retryJob(
        @Param('network') network: string,
        @Param('baseName') baseName: string,
        @Param('jobId') jobId: string,
        @Body() body: RetryJobBodyDto,
    ): Promise<{ ok: boolean; jobId: string; manualRetryCount: number }> {
        const queue = this.queueRegistry.getQueue(network, baseName);

        const job = await Job.fromId(queue, jobId);
        if (!job) {
            throw new NotFoundException(`Job "${jobId}" not found in queue "${queue.name}"`);
        }

        const state = await job.getState();
        if (state !== 'failed') {
            throw new ConflictException({ message: 'Job is not in failed state', state });
        }

        const data = job.data as Record<string, unknown> | undefined;
        const currentCount: number = (data?.['manualRetryCount'] as number) ?? 0;

        if (currentCount >= 3 && !body.force) {
            throw new HttpException(
                {
                    message: 'Manual retry budget exhausted. Pass force: true to override.',
                    manualRetryCount: currentCount,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const updatedCount = currentCount + 1;
        await job.updateData({ ...job.data, manualRetryCount: updatedCount });
        await job.retry();

        this.logger.log(
            `retryJob: network=${network} queue=${baseName} jobId=${jobId} manualRetryCount=${updatedCount}`,
        );

        return { ok: true, jobId, manualRetryCount: updatedCount };
    }

    // -------------------------------------------------------------------------
    // POST /:network/queues/:baseName/retry-all-failed
    // -------------------------------------------------------------------------

    @Post(':network/queues/:baseName/retry-all-failed')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry failed jobs in bulk',
        description:
            'Fetches up to `limit` failed jobs, applies the per-job manual retry budget, ' +
            'and re-queues eligible jobs.  Returns counts of retried, skipped, and errored jobs.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'baseName', description: 'Base queue name' })
    @ApiBody({ type: RetryAllFailedBodyDto })
    @ApiResponse({ status: 200, type: RetryAllFailedResultDto })
    async retryAllFailed(
        @Param('network') network: string,
        @Param('baseName') baseName: string,
        @Body() body: RetryAllFailedBodyDto,
    ): Promise<RetryAllFailedResultDto> {
        const queue = this.queueRegistry.getQueue(network, baseName);
        const limit = body.limit ?? 500;
        const force = body.force ?? false;
        const olderThanMs = body.olderThanMs;

        this.logger.log(
            `retryAllFailed: network=${network} queue=${baseName} limit=${limit} force=${force}`,
        );

        // Paged rather than one getFailed(0, limit-1). BullMQ v5 resolves a
        // getFailed range with one HGETALL per job through Promise.all, so a
        // single 500-job call fires 500 concurrent commands down one socket —
        // the exact saturation this controller documents against the failed-jobs
        // listing below, and now worse, because every queue in the API shares one
        // connection. Windowing keeps in-flight commands bounded while preserving
        // this endpoint's per-job semantics (retry budget + age filter), which a
        // server-side queue.retryJobs() sweep cannot express.
        const failedJobs: Job[] = [];
        for (let start = 0; start < limit; start += FAILED_FETCH_CHUNK) {
            const end = Math.min(start + FAILED_FETCH_CHUNK, limit) - 1;
            const page = await queue.getFailed(start, end);
            const jobs = (page as (Job | undefined | null)[]).filter((j): j is Job => j != null);
            failedJobs.push(...jobs);
            if (jobs.length === 0 || failedJobs.length >= limit) break;
        }

        let retried = 0;
        let skipped = 0;
        const errors: { jobId: string; reason: string }[] = [];

        for (const job of failedJobs) {
            try {
                // Optional age filter
                if (olderThanMs !== undefined) {
                    const finishedOn = job.finishedOn ?? 0;
                    if (Date.now() - finishedOn < olderThanMs) {
                        skipped++;
                        continue;
                    }
                }

                const data = job.data as Record<string, unknown> | undefined;
                const currentCount: number = (data?.['manualRetryCount'] as number) ?? 0;

                if (currentCount >= 3 && !force) {
                    skipped++;
                    continue;
                }

                const updatedCount = currentCount + 1;
                await job.updateData({ ...job.data, manualRetryCount: updatedCount });
                await job.retry();
                retried++;
            } catch (error: unknown) {
                const reason = error instanceof Error ? error.message : String(error);
                errors.push({ jobId: job.id ?? '', reason });
            }
        }

        this.logger.log(
            `retryAllFailed: network=${network} queue=${baseName} retried=${retried} skipped=${skipped} errors=${errors.length}`,
        );

        return { retried, skipped, errors };
    }

    // -------------------------------------------------------------------------
    // POST /:network/queues/:baseName/pause | /resume | /clean
    // -------------------------------------------------------------------------
    //
    // These were commented out pending "the operator admin panel with
    // authentication" — that shipped, and @AdminWrite (JWT + admin role + CSRF)
    // is the same gate every other mutating endpoint here uses.
    //
    // They are the in-band tools for the failure this system actually hits:
    // Redict filling up. Pausing the noisiest queue stops new work while a
    // backlog drains, and clean() reclaims memory from finished-job history —
    // previously only reachable by hand with redis-cli against production.

    @Post(':network/queues/:baseName/pause')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Pause a queue',
        description:
            'Stops workers picking up NEW jobs from this queue. Jobs already running ' +
            'continue to completion, and producers can still enqueue. The backlog ' +
            'simply stops being consumed.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'baseName', description: 'Base queue name' })
    @ApiResponse({ status: 200, description: 'Queue paused' })
    async pauseQueue(
        @Param('network') network: string,
        @Param('baseName') baseName: string,
    ): Promise<{ baseName: string; isPaused: boolean }> {
        const queue = this.queueRegistry.getQueue(network, baseName);
        await queue.pause();
        this.invalidateQueueCounts(network);
        this.logger.warn(`pauseQueue: network=${network} queue=${baseName}`);
        return { baseName, isPaused: true };
    }

    @Post(':network/queues/:baseName/resume')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Resume a paused queue',
        description:
            'Lets workers pick up jobs from this queue again, starting with the backlog that built up while it ' +
            'was paused.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'baseName', description: 'Base queue name' })
    @ApiResponse({ status: 200, description: 'Queue resumed' })
    async resumeQueue(
        @Param('network') network: string,
        @Param('baseName') baseName: string,
    ): Promise<{ baseName: string; isPaused: boolean }> {
        const queue = this.queueRegistry.getQueue(network, baseName);
        await queue.resume();
        this.invalidateQueueCounts(network);
        this.logger.warn(`resumeQueue: network=${network} queue=${baseName}`);
        return { baseName, isPaused: false };
    }

    @Post(':network/queues/:baseName/clean')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Clear finished jobs from a queue',
        description:
            'Deletes completed or failed jobs older than `graceMs`, up to `limit` per ' +
            'call. Only finished jobs are eligible. Waiting, delayed and active jobs ' +
            'are never touched, so no pending work is lost. Repeat until `removed` ' +
            'comes back smaller than `limit`.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'baseName', description: 'Base queue name' })
    @ApiBody({ type: CleanQueueBodyDto })
    @ApiResponse({ status: 200, description: 'Jobs removed' })
    async cleanQueue(
        @Param('network') network: string,
        @Param('baseName') baseName: string,
        @Body() body: CleanQueueBodyDto,
    ): Promise<{ baseName: string; status: string; removed: number; limit: number }> {
        const queue = this.queueRegistry.getQueue(network, baseName);
        const status = body.status ?? 'completed';
        const graceMs = body.graceMs ?? 3_600_000;
        const limit = body.limit ?? 5000;

        const removed = await queue.clean(graceMs, limit, status);
        this.invalidateQueueCounts(network);

        this.logger.warn(
            `cleanQueue: network=${network} queue=${baseName} status=${status} ` +
            `graceMs=${graceMs} removed=${removed.length}`,
        );
        return { baseName, status, removed: removed.length, limit };
    }

    // -------------------------------------------------------------------------
    // GET /:network/sync-status
    // -------------------------------------------------------------------------

    @Get(':network/sync-status')
    @ApiOperation({
        summary: 'Check how up to date the data is',
        description:
            'Returns aggregate stats (total/synced topics, total messages) and the lag ' +
            'computed from MAX(lastUpdate) across ALL topic_cache rows, not just the page shown in the UI. ' +
            'Use /sync-status/topics and /sync-status/tokens for the paginated detail tables.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: SyncStatusDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async getSyncStatus(@Param('network') network: string): Promise<SyncStatusDto> {
        const now = Date.now();
        let cached = this.syncStatusCache.get(network);

        if (!cached || cached.expiresAt <= now) {
            const ds = this.dataSources.getDataSource(network);

            const [[aggRow]]: [
                Array<{
                    totalTopics: string;
                    syncedTopics: string;
                    totalMessages: string;
                    maxLastUpdate: string | null;
                }>,
            ] = await Promise.all([
                ds.query(
                    `SELECT COUNT(*)::int                                      AS "totalTopics",
                            COUNT(*) FILTER (WHERE "hasNext" = false)::int     AS "syncedTopics",
                            COALESCE(SUM(messages), 0)::bigint                 AS "totalMessages",
                            MAX("lastUpdate")                                   AS "maxLastUpdate"
                     FROM topic_cache`,
                ),
            ]);

            // lastUpdate is stored as millisecond string ("1778146836950") or
            // Hedera consensus format ("1746620000.123456789"). MAX() on text gives the
            // lexicographic maximum which is correct for uniform 13-digit ms strings.
            let maxSeconds: number | null = null;
            if (aggRow?.maxLastUpdate) {
                const raw = parseInt(aggRow.maxLastUpdate.split('.')[0], 10);
                const secs = raw > 1e10 ? Math.floor(raw / 1000) : raw;
                if (!isNaN(secs) && secs > 0) maxSeconds = secs;
            }

            cached = {
                maxSeconds,
                totalTopics: Number(aggRow?.totalTopics ?? 0),
                syncedTopics: Number(aggRow?.syncedTopics ?? 0),
                totalMessages: Number(aggRow?.totalMessages ?? 0),
                expiresAt: now + QueueStatusController.SYNC_STATUS_TTL_MS,
            };
            this.syncStatusCache.set(network, cached);
        }

        // Lag is recomputed live each call so the indicator stays accurate even
        // while the aggregate is served from cache.
        const lastSyncedAt =
            cached.maxSeconds !== null ? new Date(cached.maxSeconds * 1000).toISOString() : null;
        const lagSeconds =
            cached.maxSeconds !== null ? Math.max(0, Math.floor(Date.now() / 1000) - cached.maxSeconds) : 0;

        return {
            lastSyncedAt,
            lagSeconds,
            totalTopics: cached.totalTopics,
            syncedTopics: cached.syncedTopics,
            totalMessages: cached.totalMessages,
        };
    }

    @Get(':network/sync-status/topics')
    @ApiOperation({
        summary: 'See sync progress for each Guardian topic',
        description:
            'Returns topics from topic_cache ordered by message count desc. ' +
            'Use the search param to filter by topicId prefix/substring (case-insensitive).',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Filter by topicId (ILIKE)' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Topics per page (default 10, max 100)' })
    @ApiResponse({ status: 200, type: SyncTopicsPageDto })
    @ApiResponse({ status: 404, description: 'Network not configured' })
    async getSyncTopics(
        @Param('network') network: string,
        @Query() query: SyncTopicsQueryDto,
    ): Promise<SyncTopicsPageDto> {
        const ds = this.dataSources.getDataSource(network);
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 10;
        const search = (query.search ?? '').trim();
        const statusFilter = (query.status ?? '').trim();
        const offset = (page - 1) * pageSize;

        const conditions: string[] = [];
        const filterParams: unknown[] = [];

        if (search) {
            filterParams.push(`%${search}%`);
            conditions.push(`"topicId" ILIKE $${filterParams.length}`);
        }
        if (statusFilter) {
            filterParams.push(statusFilter);
            conditions.push(`status = $${filterParams.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const dataParams = [...filterParams, pageSize, offset];

        const [rows, [countRow]]: [
            Array<{ topicId: string; messages: number; hasNext: boolean; lastUpdate: string; status: string }>,
            Array<{ total: string }>,
        ] = await Promise.all([
            ds.query(
                `SELECT "topicId", messages, "hasNext", "lastUpdate", status
                 FROM topic_cache
                 ${whereClause}
                 ORDER BY messages DESC
                 LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
                dataParams,
            ),
            ds.query(
                `SELECT COUNT(*)::int AS total FROM topic_cache ${whereClause}`,
                filterParams,
            ),
        ]);

        const topics: TopicSyncItemDto[] = rows.map((r) => {
            const raw = parseInt((r.lastUpdate ?? '').split('.')[0], 10);
            const secs = raw > 1e10 ? Math.floor(raw / 1000) : raw;
            return {
                topicId: r.topicId,
                messageCount: Number(r.messages),
                hasNext: r.hasNext,
                lastUpdate: !isNaN(secs) && secs > 0 ? new Date(secs * 1000).toISOString() : '',
                status: r.status,
            };
        });

        return {
            total: Number(countRow?.total ?? 0),
            page,
            pageSize,
            search,
            topics,
        };
    }

    @Post(':network/sync-status/requeue-topic')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Sync a Guardian topic now',
        description:
            'Upserts the topic into topic_cache (creating the row if missing, ' +
            'setting hasNext=true) and enqueues a job on the TOPIC_SYNC_PRIORITY ' +
            'lane so it runs ahead of the routine re-poll backlog; re-polling is ' +
            'handed back to the bulk lane once the topic is caught up. Use this when ' +
            'ONLY_REGISTRY_TOPIC was added after the seed topic was fully crawled, ' +
            'or when you need to manually re-trigger a sync for a stalled topic.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiBody({ type: RequeueTopicBodyDto })
    @ApiResponse({
        status: 200,
        description: 'Topic enqueued for sync',
        schema: { example: { queued: true, topicId: '0.0.43065', fromSequenceNumber: 0 } },
    })
    @ApiResponse({ status: 400, description: 'Invalid topic ID format' })
    async requeueTopic(
        @Param('network') network: string,
        @Body() body: RequeueTopicBodyDto,
    ): Promise<{ queued: boolean; topicId: string; fromSequenceNumber: number }> {
        const ds = this.dataSources.getDataSource(network);
        const topicId = body.topicId.trim();

        if (!/^0\.0\.\d+$/.test(topicId)) {
            throw new HttpException(
                `Invalid topic ID "${topicId}". Expected format "0.0.<number>".`,
                HttpStatus.BAD_REQUEST,
            );
        }

        // Upsert the topic_cache row. If new, start from sequence 0.
        // If existing, either reset to 0 or resume from current watermark.
        const fromStart = body.fromStart === true;
        await ds.query(
            `INSERT INTO topic_cache ("topicId", status, messages, "hasNext", "lastUpdate")
             VALUES ($1, 'NEW', 0, true, $2)
             ON CONFLICT ("topicId") DO UPDATE SET
                 "hasNext"    = true,
                 messages     = CASE WHEN $3::boolean THEN 0 ELSE topic_cache.messages END,
                 "lastUpdate" = EXCLUDED."lastUpdate"`,
            [topicId, Date.now().toString(), fromStart],
        );

        const currentRows: Array<{ messages: number }> = await ds.query(
            `SELECT messages FROM topic_cache WHERE "topicId" = $1 LIMIT 1`,
            [topicId],
        );
        const fromSeq = currentRows[0]?.messages ?? 0;

        const topicQueue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.TOPIC_SYNC_PRIORITY);
        const bulkTopicQueue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.TOPIC_SYNC);
        const jobId = `topic-${topicId}-${fromSeq}`;
        for (const queue of [topicQueue, bulkTopicQueue]) {
            try {
                const stale = await queue.getJob(jobId);
                if (stale) await stale.remove();
            } catch {
                // Not present, or locked by a running worker — fine either way.
            }
        }

        await topicQueue.add(
            'sync',
            { topicId, fromSequenceNumber: fromSeq, isOrgTopic: false, oneTimePriority: true },
            { jobId, priority: 1 },
        );

        this.logger.log(
            `requeueTopic: network=${network} topicId=${topicId} fromSeq=${fromSeq} fromStart=${fromStart}`,
        );

        return { queued: true, topicId, fromSequenceNumber: fromSeq };
    }

    @Get(':network/sync-status/tokens')
    @ApiOperation({
        summary: 'See sync progress for each token',
        description:
            'Returns tokens from token_cache. ' +
            'Use the search param to filter by tokenId prefix/substring (case-insensitive).',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Filter by tokenId (ILIKE)' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Tokens per page (default 10, max 100)' })
    @ApiResponse({ status: 200, type: SyncTokensPageDto })
    @ApiResponse({ status: 404, description: 'Network not configured' })
    async getSyncTokens(
        @Param('network') network: string,
        @Query() query: SyncTokensQueryDto,
    ): Promise<SyncTokensPageDto> {
        const ds = this.dataSources.getDataSource(network);
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 10;
        const search = (query.search ?? '').trim();
        const typeFilter = (query.type ?? '').trim();
        const offset = (page - 1) * pageSize;

        const conditions: string[] = [];
        const filterParams: unknown[] = [];

        if (search) {
            filterParams.push(`%${search}%`);
            conditions.push(`"tokenId" ILIKE $${filterParams.length}`);
        }
        if (typeFilter) {
            filterParams.push(typeFilter);
            conditions.push(`type = $${filterParams.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const dataParams = [...filterParams, pageSize, offset];

        const [rows, [countRow]]: [
            Array<{ tokenId: string; serialNumber: number; hasNext: boolean; type: string | null }>,
            Array<{ total: string }>,
        ] = await Promise.all([
            ds.query(
                `SELECT "tokenId", "serialNumber", "hasNext", type
                 FROM token_cache
                 ${whereClause}
                 LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
                dataParams,
            ),
            ds.query(
                `SELECT COUNT(*)::int AS total FROM token_cache ${whereClause}`,
                filterParams,
            ),
        ]);

        const tokens: TokenSyncItemDto[] = rows.map((r) => ({
            tokenId: r.tokenId,
            serialNumber: Number(r.serialNumber),
            hasNext: r.hasNext,
            type: r.type,
        }));

        return {
            total: Number(countRow?.total ?? 0),
            page,
            pageSize,
            search,
            tokens,
        };
    }

    // -------------------------------------------------------------------------
    // GET /:network/ipfs-status — paginated IPFS CID status list (all CIDs)
    // -------------------------------------------------------------------------

    @Get(':network/ipfs-status')
    @ApiOperation({
        summary: 'See which IPFS files have been downloaded',
        description:
            'Returns a paginated list of every CID found in message.files, ' +
            'enriched with the linked message\'s topicId and type, plus a derived status: ' +
            '"fetched" (exists in ipfs_files), "failed" (exists in ipfs_fetch_failure), ' +
            'or "pending" (neither). Supports filtering by topicId, CID substring, ' +
            'errorCategory, and status.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiQuery({ name: 'topicId', required: false, type: String, description: 'Filter by message topicId' })
    @ApiQuery({ name: 'includeChildTopics', required: false, type: Boolean, description: 'When true and topicId is set, also include all descendant topics' })
    @ApiQuery({ name: 'messageType', required: false, type: String, description: 'Filter by message type (e.g. VC-Document, Instance-Policy)' })
    @ApiQuery({ name: 'cid', required: false, type: String, description: 'Filter by CID (partial ILIKE match)' })
    @ApiQuery({
        name: 'errorCategory',
        required: false,
        type: String,
        enum: ['transient', 'permanent', 'unknown'],
        description: 'Filter by error category (only meaningful when status is "failed")',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        type: String,
        enum: ['fetched', 'failed', 'pending'],
        description: 'Filter by derived fetch status',
    })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
    @ApiQuery({
        name: 'sortBy',
        required: false,
        type: String,
        enum: ['lastFailedAt', 'attemptCount', 'firstFailedAt', 'status'],
        description: 'Sort column (default status)',
    })
    @ApiQuery({ name: 'sortDir', required: false, type: String, enum: ['asc', 'desc'], description: 'Sort direction (default desc)' })
    @ApiQuery({ name: 'fresh', required: false, type: Boolean, description: 'Bypass the short-lived server-side cache for this request' })
    @ApiResponse({ status: 200, type: IpfsCidStatusListDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async listIpfsStatus(
        @Param('network') network: string,
        @Query() query: IpfsStatusQueryDto,
    ): Promise<IpfsCidStatusListDto> {
        const ds = this.dataSources.getDataSource(network);

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const sortBy = query.sortBy ?? 'status';
        // Default ASC, not DESC: 'failed' < 'fetched' < 'pending' alphabetically,
        // and 'pending' is ~97% of rows at scale (measured on testnet locally).
        // DESC forces a full sort through that dominant group before LIMIT can
        // apply even with status now indexed (measured 30.1s); ASC lets the
        // index scan terminate after the two small groups (measured 1.5s). This
        // also happens to match the panel's actual intent better — surfacing
        // failures first, not the least-actionable "pending" bucket.
        const sortDir = (query.sortDir ?? 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const offset = (page - 1) * limit;

        // This endpoint's default (unfiltered) view does a full sequential scan +
        // unnest over the entire `message` table, so cache it the same way
        // listQueues/getSyncStatus cache their own full-table work. Built from the
        // resolved values (post-default) so `?limit=20` and an omitted `limit`
        // share one entry. `fresh` is a read-policy flag, not a filter — it must
        // never enter the key, or a fresh request would warm a key nothing else reads.
        const cacheKey = [
            'ipfs-status',
            network.toLowerCase(),
            query.topicId ?? '',
            query.includeChildTopics ? '1' : '0',
            query.messageType ?? '',
            query.cid ?? '',
            query.errorCategory ?? '',
            query.status ?? '',
            page, limit, sortBy, sortDir,
        ].join(':');

        // Separate, coarser key for the total-count fallback: the total only
        // depends on the filter conditions, never on page/limit/sortBy/sortDir.
        // Keying it the same as cacheKey (as the first version of this did)
        // meant every distinct page or sort order needed its OWN successful
        // count before it could fall back, even though they all share the same
        // answer — so paging through a view whose count keeps timing out could
        // show "0" on every page rather than reusing the one total that did
        // succeed for that filter set.
        const totalCacheKey = [
            'ipfs-status-total',
            network.toLowerCase(),
            query.topicId ?? '',
            query.includeChildTopics ? '1' : '0',
            query.messageType ?? '',
            query.cid ?? '',
            query.errorCategory ?? '',
            query.status ?? '',
        ].join(':');

        if (!query.fresh) {
            const cached = this.ipfsStatusCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) return cached.payload;
        }

        // mc.status is a real, indexed column (see schema-bootstrap.ts) — NOT a
        // derived CASE over the ipfs_files/ipfs_fetch_failure joins as before.
        // That's what makes the sortDir default above actually matter: a
        // derived cross-table expression can't be indexed at all, so ordering
        // by it always required a full sort regardless of direction.
        const sortColMap: Record<string, string> = {
            lastFailedAt: 'f."lastFailedAt"',
            attemptCount: 'f."attemptCount"',
            firstFailedAt: 'f."firstFailedAt"',
            status: 'mc.status',
        };
        const orderExpr = `${sortColMap[sortBy] ?? 'mc.status'} ${sortDir}`;

        // Build WHERE clauses incrementally. Start with an always-true sentinel
        // so subsequent AND clauses can always be appended uniformly.
        const params: unknown[] = [];
        const conditions: string[] = ['1 = 1'];

        // Optional CTE for descendant topics — only materialized when needed.
        let topicCte = '';
        if (query.topicId) {
            params.push(query.topicId);
            if (query.includeChildTopics) {
                topicCte = `WITH RECURSIVE _topic_tree("topicId") AS (
                    SELECT $${params.length}::text
                    UNION ALL
                    SELECT t."topicId"
                    FROM message t
                    JOIN _topic_tree d ON (t.options->>'parentId') = d."topicId"
                    WHERE t.type = 'Topic'
                ) `;
                conditions.push(`mc."topicId" IN (SELECT "topicId" FROM _topic_tree)`);
            } else {
                conditions.push(`mc."topicId" = $${params.length}`);
            }
        }

        if (query.messageType) {
            params.push(query.messageType);
            conditions.push(`mc."messageType" = $${params.length}`);
        }

        if (query.cid) {
            params.push(`%${query.cid}%`);
            conditions.push(`mc.cid ILIKE $${params.length}`);
        }

        if (query.errorCategory) {
            params.push(query.errorCategory);
            conditions.push(`f."errorCategory" = $${params.length}`);
        }

        if (query.status) {
            params.push(query.status);
            conditions.push(`mc.status = $${params.length}`);
        }

        const whereClause = conditions.join(' AND ');

        // Core FROM + JOIN fragment shared by count and data queries.
        // message_ipfs_cid precomputes the (cid, message) relationship at
        // ingestion time (see message-process.processor.ts's reconcile step),
        // so this no longer touches `message` at all — it used to be
        // `FROM message m, unnest(m.files) AS c(cid)`, an unfiltered scan +
        // unnest of the entire message table on every request (cost scaled
        // with total message count, not the 20 rows the panel shows; measured
        // 38.9s at 3.4M messages locally, past the API's own 15s
        // statement_timeout). No ipfs_files join anymore either — mc.status is
        // already the fetched/failed/pending outcome (kept in sync by whatever
        // writes to ipfs_files/ipfs_fetch_failure), so ipfs_files itself is no
        // longer needed here at all. ipfs_fetch_failure stays joined for the
        // per-failure metadata (lastError, attemptCount, etc.) that mc doesn't
        // carry.
        const fromFragment = `
            FROM message_ipfs_cid mc
            LEFT JOIN ipfs_fetch_failure f ON f.cid = mc.cid
        `;

        // Total count (same joins + filters, no pagination).
        const countSql = `${topicCte}
            SELECT COUNT(DISTINCT mc.cid)::int AS total
            ${fromFragment}
            WHERE ${whereClause}
        `;

        // Data rows.
        params.push(limit);
        const limitPlaceholder = `$${params.length}`;
        params.push(offset);
        const offsetPlaceholder = `$${params.length}`;

        const dataSql = `${topicCte}
            SELECT DISTINCT
                mc.cid,
                mc."topicId"                   AS "topicId",
                mc."messageType"                AS "messageType",
                mc.status                     AS status,
                f."lastError",
                f."errorCategory",
                f."attemptCount",
                f."manualRetryCount",
                f."firstFailedAt",
                f."lastFailedAt"
            ${fromFragment}
            WHERE ${whereClause}
            ORDER BY ${orderExpr}
            LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
        `;

        // The count query has no LIMIT/status-index to lean on — it always
        // touches every matching row, so under concurrent load elsewhere on
        // this database it's the one piece of this endpoint still exposed to
        // a statement_timeout (measured: the data query itself came back fine
        // in the same incident that produced this fallback). Not fatal to the
        // request: the row data is what the panel actually renders, and a
        // pagination total one refresh cycle stale beats a 500 for the whole
        // panel over a count nobody is watching that closely.
        const [countRows, rows]: [
            Array<{ total: number }> | null,
            Array<{
                cid: string;
                topicId: string | null;
                messageType: string | null;
                status: string;
                lastError: string | null;
                errorCategory: string | null;
                attemptCount: number | null;
                manualRetryCount: number | null;
                firstFailedAt: string | null;
                lastFailedAt: string | null;
            }>,
        ] = await Promise.all([
            ds.query(countSql, params.slice(0, params.length - 2)).catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(
                    `listIpfsStatus count query failed for network=${network} — ` +
                    `falling back to last known total: ${msg}`,
                );
                return null;
            }),
            ds.query(dataSql, params),
        ]);

        const total = countRows
            ? Number(countRows[0]?.total ?? 0)
            : this.ipfsStatusTotalCache.get(totalCacheKey) ?? 0;
        if (countRows) {
            // Same unbounded-cardinality concern as ipfsStatusCache (topicId is
            // free text) — cap it the same way, evicting the oldest entry.
            if (!this.ipfsStatusTotalCache.has(totalCacheKey)
                && this.ipfsStatusTotalCache.size >= IPFS_STATUS_CACHE_MAX_ENTRIES) {
                const oldest = this.ipfsStatusTotalCache.keys().next().value;
                if (oldest !== undefined) this.ipfsStatusTotalCache.delete(oldest);
            }
            this.ipfsStatusTotalCache.set(totalCacheKey, total);
        }

        const toV1 = (raw: string): string => {
            try { return new CID(raw).toV1().toString('base32'); }
            catch { return raw; }
        };

        const data: IpfsCidStatusDto[] = rows.map((r) => ({
            cid: r.cid,
            cidV1: toV1(r.cid),
            topicId: r.topicId ?? null,
            messageType: r.messageType ?? null,
            status: r.status,
            lastError: r.lastError ?? null,
            errorCategory: r.errorCategory ?? null,
            attemptCount: r.attemptCount != null ? Number(r.attemptCount) : null,
            manualRetryCount: r.manualRetryCount != null ? Number(r.manualRetryCount) : null,
            firstFailedAt: r.firstFailedAt != null ? String(r.firstFailedAt) : null,
            lastFailedAt: r.lastFailedAt != null ? String(r.lastFailedAt) : null,
        }));

        const payload: IpfsCidStatusListDto = {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
        this.setIpfsStatusCache(cacheKey, payload);
        return payload;
    }

    /** Write-through for listIpfsStatus's cache, with sweep-on-write eviction —
     * topicId is free-text, so nothing else ever expires a stale Map entry. */
    private setIpfsStatusCache(key: string, payload: IpfsCidStatusListDto): void {
        const now = Date.now();
        for (const [k, v] of this.ipfsStatusCache) {
            if (v.expiresAt <= now) this.ipfsStatusCache.delete(k);
        }
        // Map preserves insertion order, so the first key is the oldest write.
        while (this.ipfsStatusCache.size >= IPFS_STATUS_CACHE_MAX_ENTRIES) {
            const oldest = this.ipfsStatusCache.keys().next().value;
            if (oldest === undefined) break;
            this.ipfsStatusCache.delete(oldest);
        }
        this.ipfsStatusCache.set(key, { payload, expiresAt: now + IPFS_STATUS_TTL_MS });
    }

    /** Drops every cached ipfs-status page for a network after an action that
     * changes the underlying ipfs_fetch_failure rows (a retry). */
    private invalidateIpfsStatus(network: string): void {
        const prefix = `ipfs-status:${network.toLowerCase()}:`;
        for (const k of this.ipfsStatusCache.keys()) {
            if (k.startsWith(prefix)) this.ipfsStatusCache.delete(k);
        }
    }

    // -------------------------------------------------------------------------
    // POST /:network/ipfs-status/:cid/retry — retry a single CID
    // -------------------------------------------------------------------------

    @Post(':network/ipfs-status/:cid/retry')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry downloading one IPFS file',
        description:
            'Verifies the CID exists in ipfs_fetch_failure, increments its manualRetryCount, ' +
            'deletes the failure record (so the boot-time safety net will not re-park it), ' +
            'removes any stale BullMQ job for this CID, and enqueues a fresh IPFS fetch job. ' +
            'The job uses the deterministic jobId "ipfs-{cid}" so further duplicates are prevented.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'cid', description: 'IPFS CID to retry' })
    @ApiResponse({ status: 200, description: 'CID successfully re-queued', schema: { example: { queued: true, cid: 'bafkrei...' } } })
    @ApiResponse({ status: 404, description: 'CID not found in ipfs_fetch_failure table or network not configured' })
    async retryIpfsFailure(
        @Param('network') network: string,
        @Param('cid') cid: string,
    ): Promise<{ queued: boolean; cid: string }> {
        const ds = this.dataSources.getDataSource(network);

        // Verify the CID exists and fetch its current manualRetryCount.
        const existing: Array<{ manualRetryCount: number; messageTimestamp: string | null }> =
            await ds.query(
                `SELECT "manualRetryCount", "messageTimestamp"
                 FROM ipfs_fetch_failure
                 WHERE cid = $1
                 LIMIT 1`,
                [cid],
            );

        if (existing.length === 0) {
            throw new NotFoundException(
                `CID "${cid}" not found in ipfs_fetch_failure on network "${network}".`,
            );
        }

        const { manualRetryCount, messageTimestamp } = existing[0];

        // Increment the counter before deleting so it can be embedded in job data
        // for observability (the processor logs it).
        const updatedRetryCount = Number(manualRetryCount) + 1;

        // Delete the failure record — the boot-time safety net scans this table
        // and would re-park the CID if the record remains.
        await ds.query(`DELETE FROM ipfs_fetch_failure WHERE cid = $1`, [cid]);
        // Keep message_ipfs_cid.status in sync (see schema-bootstrap.ts) — the
        // CID is back to pending until the re-queued fetch below resolves it.
        // Guarded against 'fetched' in case a fetch races ahead of this request.
        await ds.query(
            `UPDATE message_ipfs_cid SET status = 'pending' WHERE cid = $1 AND status <> 'fetched'`,
            [cid],
        );

        // Remove any stale BullMQ job (completed, failed, or waiting) so the
        // new add() is not de-duplicated against a prior entry.
        const ipfsQueue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.IPFS_FETCH);
        const jobId = `ipfs-${cid}`;
        try {
            const stale = await ipfsQueue.getJob(jobId);
            if (stale) await stale.remove();
        } catch {
            // Job simply not present — that is fine.
        }

        await ipfsQueue.add(
            'fetch',
            { cid, messageTimestamp: messageTimestamp ?? undefined, manualRetryCount: updatedRetryCount },
            { jobId },
        );

        this.logger.log(
            `IPFS manual retry queued: cid=${cid} network=${network} manualRetryCount=${updatedRetryCount}`,
        );

        this.invalidateIpfsStatus(network);
        return { queued: true, cid };
    }

    // -------------------------------------------------------------------------
    // POST /:network/ipfs-status/retry-by-topic — bulk retry by topicId
    // -------------------------------------------------------------------------

    @Post(':network/ipfs-status/retry-by-topic')
    @AdminWrite()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry all failed IPFS downloads for a topic',
        description:
            'Finds every CID in ipfs_fetch_failure whose linked message belongs to the given topicId, ' +
            'then for each: deletes the failure record, removes the stale BullMQ job, and re-enqueues ' +
            'a fresh IPFS fetch. Returns the count of CIDs queued.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiBody({ type: RetryByTopicBodyDto })
    @ApiResponse({
        status: 200,
        description: 'Bulk retry result',
        schema: { example: { queued: 3, topicId: '0.0.12345' } },
    })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async retryIpfsFailuresByTopic(
        @Param('network') network: string,
        @Body() body: RetryByTopicBodyDto,
    ): Promise<{ queued: number; topicId: string; hasMore: boolean }> {
        const ds = this.dataSources.getDataSource(network);
        const { topicId, includeChildTopics } = body;

        // Find all CIDs in ipfs_fetch_failure that are linked to messages from
        // this topic (and optionally its descendants).
        const cte = includeChildTopics
            ? `WITH RECURSIVE _topic_tree("topicId") AS (
                   SELECT $1::text
                   UNION ALL
                   SELECT t."topicId"
                   FROM message t
                   JOIN _topic_tree d ON (t.options->>'parentId') = d."topicId"
                   WHERE t.type = 'Topic'
               ) `
            : '';
        const topicCondition = includeChildTopics
            ? `m."topicId" IN (SELECT "topicId" FROM _topic_tree)`
            : `m."topicId" = $1`;

        // Capped. A topic subtree can carry an unbounded number of failed CIDs,
        // and this previously re-queued every one of them — with no limit, three
        // sequential Redis round-trips each, into the narrowest lane in the
        // system. `hasMore` lets the operator repeat until it comes back false.
        const failureRows: Array<{ cid: string; messageTimestamp: string | null; manualRetryCount: number }> =
            await ds.query(
                `${cte}SELECT f.cid, f."messageTimestamp", f."manualRetryCount"
                 FROM ipfs_fetch_failure f
                 JOIN message m
                      ON f.cid = ANY(m.files)
                 WHERE ${topicCondition}
                 ORDER BY f."lastFailedAt" DESC, f.cid
                 LIMIT ${RETRY_BY_TOPIC_MAX + 1}`,
                [topicId],
            );

        const hasMore = failureRows.length > RETRY_BY_TOPIC_MAX;
        if (hasMore) failureRows.length = RETRY_BY_TOPIC_MAX;

        if (failureRows.length === 0) {
            this.logger.log(
                `retryIpfsFailuresByTopic: no failures found for topicId=${topicId} on ${network}`,
            );
            return { queued: 0, topicId, hasMore: false };
        }

        const cids = failureRows.map((r) => r.cid);

        // Bulk-delete all failure records in a single query.
        await ds.query(
            `DELETE FROM ipfs_fetch_failure WHERE cid = ANY($1::text[])`,
            [cids],
        );
        // Keep message_ipfs_cid.status in sync (see schema-bootstrap.ts).
        await ds.query(
            `UPDATE message_ipfs_cid SET status = 'pending' WHERE cid = ANY($1::text[]) AND status <> 'fetched'`,
            [cids],
        );

        const ipfsQueue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.IPFS_FETCH);

        if (!await canEnqueueBulk(this.queueRegistry.getConnection(), ipfsQueue, 'retryIpfsByTopic')) {
            throw new HttpException(
                'Redis is under memory pressure or the IPFS queue is already deep. ' +
                'Wait for it to drain and retry.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        // Clear stale jobs in bounded batches, then re-add in one bulk call,
        // instead of getJob + remove + add per CID. The batching is not
        // cosmetic: every queue in this process shares one Redis connection, so
        // firing all 2,000 removes at once would saturate the socket for every
        // other queue too — the same failure mode retryAllFailed windows against.
        for (let i = 0; i < failureRows.length; i += FAILED_FETCH_CHUNK) {
            await Promise.all(
                failureRows.slice(i, i + FAILED_FETCH_CHUNK).map(row =>
                    ipfsQueue.remove(`ipfs-${row.cid}`).catch(() => {
                        // Absent, or locked by a running worker — the add below is
                        // a no-op then, which is the correct outcome anyway.
                    }),
                ),
            );
        }

        await ipfsQueue.addBulk(failureRows.map(row => ({
            name: 'fetch',
            data: {
                cid: row.cid,
                messageTimestamp: row.messageTimestamp ?? undefined,
                manualRetryCount: Number(row.manualRetryCount) + 1,
            },
            opts: { jobId: `ipfs-${row.cid}` },
        })));

        const queued = failureRows.length;
        this.logger.log(
            `retryIpfsFailuresByTopic: network=${network} topicId=${topicId} queued=${queued} hasMore=${hasMore}`,
        );

        this.invalidateIpfsStatus(network);
        return { queued, topicId, hasMore };
    }
}
