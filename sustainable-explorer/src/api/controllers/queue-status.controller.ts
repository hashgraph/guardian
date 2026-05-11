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
} from '@nestjs/swagger';
import { Job } from 'bullmq';
import { Observable } from 'rxjs';
import { IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
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

        // Use getJobCounts for the total — reads ZCARD directly, stays consistent
        // with the queue list endpoint. getFailedCount() can diverge after removeOnFail trims.
        const [rawFailed, counts] = await Promise.all([
            queue.getFailed(offset, offset + limit - 1),
            queue.getJobCounts('failed'),
        ]);
        const total = counts['failed'] ?? 0;

        // Job.fromId returns undefined when the hash is missing (e.g. BullMQ version
        // mismatch, partial cleanup). Filter those out so the mapping doesn't throw.
        const failedJobs = (rawFailed as (Job | undefined | null)[]).filter(
            (j): j is Job => j != null,
        );

        if (groupByReason) {
            const groupMap = new Map<string, { count: number; sampleJobIds: string[] }>();
            for (const job of failedJobs) {
                const reason = job.failedReason ?? '(unknown)';
                const entry = groupMap.get(reason) ?? { count: 0, sampleJobIds: [] };
                entry.count += 1;
                if (entry.sampleJobIds.length < 5) {
                    entry.sampleJobIds.push(job.id ?? '');
                }
                groupMap.set(reason, entry);
            }

            const groups: FailedJobGroupDto[] = Array.from(groupMap.entries()).map(([reason, g]) => ({
                reason,
                count: g.count,
                sampleJobIds: g.sampleJobIds,
            }));

            return { groups };
        }

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
        const limit = body.limit ?? 100;
        const force = body.force ?? false;
        const olderThanMs = body.olderThanMs;

        const failedJobs = await queue.getFailed(0, limit - 1);

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
        summary: 'Get sync health status for a network',
        description:
            'Queries topic_cache and token_cache tables to report the last synced ' +
            'consensus timestamp, approximate lag, and per-topic/token watermarks.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: SyncStatusDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async getSyncStatus(@Param('network') network: string): Promise<SyncStatusDto> {
        const ds = this.dataSources.getDataSource(network);

        const [topicRows, tokenRows, [aggRow]]: [
            Array<{
                topicId: string;
                messages: number;
                hasNext: boolean;
                lastUpdate: string;
                status: string;
            }>,
            Array<{
                tokenId: string;
                serialNumber: number;
                hasNext: boolean;
                type: string | null;
            }>,
            Array<{ totalTopics: string; syncedTopics: string; totalMessages: string }>,
        ] = await Promise.all([
            ds.query(
                `SELECT "topicId", messages, "hasNext", "lastUpdate", status
                 FROM topic_cache
                 ORDER BY messages DESC
                 LIMIT 50`,
            ),
            ds.query(
                `SELECT "tokenId", "serialNumber", "hasNext", type
                 FROM token_cache
                 LIMIT 50`,
            ),
            ds.query(
                `SELECT COUNT(*)::int AS "totalTopics",
                        COUNT(*) FILTER (WHERE "hasNext" = false)::int AS "syncedTopics",
                        COALESCE(SUM(messages), 0)::bigint AS "totalMessages"
                 FROM topic_cache`,
            ),
        ]);

        // lastUpdate is stored as either:
        //   - milliseconds string: "1778146836950"  (13 digits, from Date.now())
        //   - Hedera consensus format: "1746620000.123456789" (seconds.nanoseconds)
        // Normalise to Unix seconds by dividing ms values by 1000.
        let maxSeconds: number | null = null;
        for (const row of topicRows) {
            if (row.lastUpdate) {
                const raw = parseInt(row.lastUpdate.split('.')[0], 10);
                const secs = raw > 1e10 ? Math.floor(raw / 1000) : raw;
                if (!isNaN(secs) && (maxSeconds === null || secs > maxSeconds)) {
                    maxSeconds = secs;
                }
            }
        }

        const lastSyncedAt = maxSeconds !== null ? new Date(maxSeconds * 1000).toISOString() : null;
        const lagSeconds =
            maxSeconds !== null ? Math.max(0, Math.floor(Date.now() / 1000) - maxSeconds) : 0;

        const topics: TopicSyncItemDto[] = topicRows.map((r) => {
            const raw = parseInt((r.lastUpdate ?? '').split('.')[0], 10);
            const secs = raw > 1e10 ? Math.floor(raw / 1000) : raw;
            const lastUpdateIso = !isNaN(secs) && secs > 0 ? new Date(secs * 1000).toISOString() : '';
            return {
                topicId: r.topicId,
                messageCount: Number(r.messages),
                hasNext: r.hasNext,
                lastUpdate: lastUpdateIso,
                status: r.status,
            };
        });

        const tokens: TokenSyncItemDto[] = tokenRows.map((r) => ({
            tokenId: r.tokenId,
            serialNumber: Number(r.serialNumber),
            hasNext: r.hasNext,
            type: r.type,
        }));

        return {
            lastSyncedAt,
            lagSeconds,
            totalTopics: Number(aggRow?.totalTopics ?? 0),
            syncedTopics: Number(aggRow?.syncedTopics ?? 0),
            totalMessages: Number(aggRow?.totalMessages ?? 0),
            topics,
            tokens,
        };
    }
}
