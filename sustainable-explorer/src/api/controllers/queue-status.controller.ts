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
import { Job } from 'bullmq';
import { Observable } from 'rxjs';
import { IsBoolean, IsInt, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import CID from 'cids';
import { BASE_QUEUE_NAMES } from '@shared/config/bullmq.config';
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

    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortDir?: string = 'desc';
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

@ApiTags('queue-status')
@Controller('api/v1')
export class QueueStatusController {
    private readonly logger = new Logger(QueueStatusController.name);

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
        summary: 'Server-Sent Events stream for real-time queue status updates',
        description:
            'Streams job lifecycle events (completed, failed, active, waiting, stalled), ' +
            'debounced counts-changed snapshots, se:events pub/sub messages, ' +
            'and a heartbeat every 25 s. Connect with EventSource on the client.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, description: 'SSE stream established' })
    streamQueueEvents(@Param('network') network: string): Observable<MessageEvent> {
        // Validate that the network is known before establishing the stream
        this.queueRegistry.getConfiguredNetworks(); // noop — just proves the service is available
        return this.queueEventsBus.streamForNetwork(network);
    }

    // -------------------------------------------------------------------------
    // GET /:network/queues — list all queues with counts
    // -------------------------------------------------------------------------

    @Get(':network/queues')
    @ApiOperation({
        summary: 'List all BullMQ queues for a network with live job counts',
        description:
            'Returns one entry per base queue name.  Counts are fetched live from ' +
            'BullMQ/Redis on every call — no caching.',
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

        const baseNames = this.queueRegistry.listBaseNames();
        const items: QueueStatusItemDto[] = [];

        for (const base of baseNames) {
            try {
                const queue = this.queueRegistry.getQueue(network, base);
                const qConfig = this.queueRegistry.getQueueConfig(network, base);
                const [rawCounts, isPaused] = await Promise.all([
                    queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
                    queue.isPaused(),
                ]);

                const counts: JobCountsDto = {
                    waiting: rawCounts['waiting'] ?? 0,
                    active: rawCounts['active'] ?? 0,
                    completed: rawCounts['completed'] ?? 0,
                    failed: rawCounts['failed'] ?? 0,
                    delayed: rawCounts['delayed'] ?? 0,
                    paused: rawCounts['paused'] ?? 0,
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

        return items;
    }

    // -------------------------------------------------------------------------
    // GET /:network/queues/:baseName/failed — failed job list / grouped
    // -------------------------------------------------------------------------

    @Get(':network/queues/:baseName/failed')
    @ApiOperation({
        summary: 'List failed jobs for a specific queue',
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
            // Scan all IDs in chunks of 500 then pipeline-fetch their hashes
            const ID_CHUNK = 500;
            const groupMap = new Map<string, { count: number; sampleJobIds: string[] }>();

            for (let batchStart = 0; batchStart < total; batchStart += ID_CHUNK) {
                const ids = await getIds(batchStart, Math.min(batchStart + ID_CHUNK - 1, total - 1));
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
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry a single failed job',
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
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry all (or a batch of) failed jobs',
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

        const rawFailed = await queue.getFailed(0, limit - 1);
        const failedJobs = (rawFailed as (Job | undefined | null)[]).filter(
            (j): j is Job => j != null,
        );

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
    // POST /:network/queues/:baseName/pause   [RESERVED — admin panel phase]
    // POST /:network/queues/:baseName/resume  [RESERVED — admin panel phase]
    // -------------------------------------------------------------------------
    // These endpoints are intentionally disabled on the public API.
    // Re-enable when the operator admin panel with authentication is shipped.
    //
    // @Post(':network/queues/:baseName/pause')
    // async pauseQueue(@Param('network') network: string, @Param('baseName') baseName: string) {
    //     const queue = this.queueRegistry.getQueue(network, baseName);
    //     await queue.pause();
    //     return { paused: true };
    // }
    //
    // @Post(':network/queues/:baseName/resume')
    // async resumeQueue(@Param('network') network: string, @Param('baseName') baseName: string) {
    //     const queue = this.queueRegistry.getQueue(network, baseName);
    //     await queue.resume();
    //     return { paused: false };
    // }

    // -------------------------------------------------------------------------
    // GET /:network/sync-status
    // -------------------------------------------------------------------------

    @Get(':network/sync-status')
    @ApiOperation({
        summary: 'Get sync health summary for a network',
        description:
            'Returns aggregate stats (total/synced topics, total messages) and the lag ' +
            'computed from MAX(lastUpdate) across ALL topic_cache rows — not just the page shown in the UI. ' +
            'Use /sync-status/topics and /sync-status/tokens for the paginated detail tables.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: SyncStatusDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async getSyncStatus(@Param('network') network: string): Promise<SyncStatusDto> {
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
        // Parse the same way as per-row normalisation.
        let maxSeconds: number | null = null;
        if (aggRow?.maxLastUpdate) {
            const raw = parseInt(aggRow.maxLastUpdate.split('.')[0], 10);
            const secs = raw > 1e10 ? Math.floor(raw / 1000) : raw;
            if (!isNaN(secs) && secs > 0) maxSeconds = secs;
        }

        const lastSyncedAt = maxSeconds !== null ? new Date(maxSeconds * 1000).toISOString() : null;
        const lagSeconds =
            maxSeconds !== null ? Math.max(0, Math.floor(Date.now() / 1000) - maxSeconds) : 0;

        return {
            lastSyncedAt,
            lagSeconds,
            totalTopics: Number(aggRow?.totalTopics ?? 0),
            syncedTopics: Number(aggRow?.syncedTopics ?? 0),
            totalMessages: Number(aggRow?.totalMessages ?? 0),
        };
    }

    @Get(':network/sync-status/topics')
    @ApiOperation({
        summary: 'Paginated topic sync watermarks with optional search',
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

    @Get(':network/sync-status/tokens')
    @ApiOperation({
        summary: 'Paginated token sync watermarks with optional search',
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
        summary: 'List all IPFS CIDs referenced by messages, with their fetch status',
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
        const sortDir = (query.sortDir ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const offset = (page - 1) * limit;

        // The derived status expression is reused in ORDER BY and status filter.
        const statusExpr = `CASE WHEN ipfs.cid IS NOT NULL THEN 'fetched' WHEN f.cid IS NOT NULL THEN 'failed' ELSE 'pending' END`;

        // Map sort columns to SQL expressions.
        const sortColMap: Record<string, string> = {
            lastFailedAt: 'f."lastFailedAt"',
            attemptCount: 'f."attemptCount"',
            firstFailedAt: 'f."firstFailedAt"',
            status: statusExpr,
        };
        const orderExpr = `${sortColMap[sortBy] ?? statusExpr} ${sortDir}`;

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
                conditions.push(`m."topicId" IN (SELECT "topicId" FROM _topic_tree)`);
            } else {
                conditions.push(`m."topicId" = $${params.length}`);
            }
        }

        if (query.messageType) {
            params.push(query.messageType);
            conditions.push(`m.type = $${params.length}`);
        }

        if (query.cid) {
            params.push(`%${query.cid}%`);
            conditions.push(`c.cid ILIKE $${params.length}`);
        }

        if (query.errorCategory) {
            params.push(query.errorCategory);
            conditions.push(`f."errorCategory" = $${params.length}`);
        }

        // status filter: translate the derived value into concrete join conditions.
        if (query.status === 'fetched') {
            conditions.push(`ipfs.cid IS NOT NULL`);
        } else if (query.status === 'failed') {
            conditions.push(`f.cid IS NOT NULL`);
        } else if (query.status === 'pending') {
            conditions.push(`ipfs.cid IS NULL AND f.cid IS NULL`);
        }

        const whereClause = conditions.join(' AND ');

        // Core FROM + JOIN fragment shared by count and data queries.
        const fromFragment = `
            FROM message m,
                 unnest(m.files) AS c(cid)
            LEFT JOIN ipfs_files ipfs ON ipfs.cid = c.cid
            LEFT JOIN ipfs_fetch_failure f ON f.cid = c.cid
        `;

        // Total count (same joins + filters, no pagination).
        const countSql = `${topicCte}
            SELECT COUNT(DISTINCT c.cid)::int AS total
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
                c.cid,
                m."topicId"                   AS "topicId",
                m.type                        AS "messageType",
                ${statusExpr}                 AS status,
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

        const [[countRow], rows]: [
            Array<{ total: number }>,
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
            ds.query(countSql, params.slice(0, params.length - 2)),
            ds.query(dataSql, params),
        ]);

        const total = Number(countRow?.total ?? 0);

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

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // -------------------------------------------------------------------------
    // POST /:network/ipfs-status/:cid/retry — retry a single CID
    // -------------------------------------------------------------------------

    @Post(':network/ipfs-status/:cid/retry')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry IPFS fetch for a single failed CID',
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

        return { queued: true, cid };
    }

    // -------------------------------------------------------------------------
    // POST /:network/ipfs-status/retry-by-topic — bulk retry by topicId
    // -------------------------------------------------------------------------

    @Post(':network/ipfs-status/retry-by-topic')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Retry all IPFS fetch failures linked to a given topicId',
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
    ): Promise<{ queued: number; topicId: string }> {
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

        const failureRows: Array<{ cid: string; messageTimestamp: string | null; manualRetryCount: number }> =
            await ds.query(
                `${cte}SELECT f.cid, f."messageTimestamp", f."manualRetryCount"
                 FROM ipfs_fetch_failure f
                 JOIN message m
                      ON f.cid = ANY(m.files)
                 WHERE ${topicCondition}`,
                [topicId],
            );

        if (failureRows.length === 0) {
            this.logger.log(
                `retryIpfsFailuresByTopic: no failures found for topicId=${topicId} on ${network}`,
            );
            return { queued: 0, topicId };
        }

        const cids = failureRows.map((r) => r.cid);

        // Bulk-delete all failure records in a single query.
        await ds.query(
            `DELETE FROM ipfs_fetch_failure WHERE cid = ANY($1::text[])`,
            [cids],
        );

        const ipfsQueue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.IPFS_FETCH);
        let queued = 0;

        for (const row of failureRows) {
            const { cid, messageTimestamp, manualRetryCount } = row;
            const updatedRetryCount = Number(manualRetryCount) + 1;
            const jobId = `ipfs-${cid}`;

            try {
                const stale = await ipfsQueue.getJob(jobId);
                if (stale) await stale.remove();
            } catch {
                // Job not present — continue.
            }

            await ipfsQueue.add(
                'fetch',
                { cid, messageTimestamp: messageTimestamp ?? undefined, manualRetryCount: updatedRetryCount },
                { jobId },
            );
            queued++;
        }

        this.logger.log(
            `retryIpfsFailuresByTopic: network=${network} topicId=${topicId} queued=${queued}`,
        );

        return { queued, topicId };
    }
}
