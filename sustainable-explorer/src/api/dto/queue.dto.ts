import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Sub-DTOs
// ---------------------------------------------------------------------------

export class JobCountsDto {
    @ApiProperty({ description: 'Jobs waiting to be picked up by a worker' })
    waiting: number;

    @ApiProperty({ description: 'Jobs currently being processed' })
    active: number;

    @ApiProperty({ description: 'Jobs that completed successfully' })
    completed: number;

    @ApiProperty({ description: 'Jobs that exhausted all retry attempts' })
    failed: number;

    @ApiProperty({ description: 'Jobs scheduled to run at a future time' })
    delayed: number;

    @ApiProperty({ description: 'Jobs in a queue that has been paused' })
    paused: number;
}

export class QueueConfigDto {
    @ApiProperty({ description: 'Worker concurrency for this queue' })
    concurrency: number;

    @ApiProperty({ description: 'Maximum number of retry attempts' })
    attempts: number;

    @ApiProperty({ description: 'Backoff strategy: exponential or fixed', enum: ['exponential', 'fixed'] })
    backoffType: string;

    @ApiProperty({ description: 'Initial backoff delay in milliseconds' })
    backoffDelay: number;
}

// ---------------------------------------------------------------------------
// Queue status list
// ---------------------------------------------------------------------------

export class QueueStatusItemDto {
    @ApiProperty({ description: 'Base queue name without network suffix, e.g. "mirror-node-topics"' })
    baseName: string;

    @ApiProperty({ description: 'Fully-qualified queue name, e.g. "mirror-node-topics-testnet"' })
    fullName: string;

    @ApiProperty({ type: JobCountsDto, description: 'Current job count breakdown' })
    counts: JobCountsDto;

    @ApiProperty({ type: QueueConfigDto, description: 'Static configuration for this queue' })
    config: QueueConfigDto;

    @ApiProperty({ description: 'Whether the queue is currently paused' })
    isPaused: boolean;
}

// ---------------------------------------------------------------------------
// Failed jobs
// ---------------------------------------------------------------------------

export class FailedJobDto {
    @ApiProperty({ description: 'BullMQ job ID' })
    id: string;

    @ApiProperty({ description: 'Job name (type)' })
    name: string;

    @ApiProperty({ description: 'Job payload data' })
    data: unknown;

    @ApiProperty({ description: 'The error message that caused the failure' })
    failedReason: string;

    @ApiProperty({ type: [String], description: 'First 3 lines of the first stack trace entry' })
    stacktrace: string[];

    @ApiProperty({ description: 'Number of attempts made before the job was marked failed' })
    attemptsMade: number;

    @ApiProperty({ description: 'Number of times this job has been manually retried via the API' })
    manualRetryCount: number;

    @ApiProperty({ description: 'Unix timestamp (ms) when the job was created' })
    timestamp: number;

    @ApiProperty({ description: 'Unix timestamp (ms) when the job started processing' })
    processedOn: number;

    @ApiProperty({ description: 'Unix timestamp (ms) when the job finished (failed)' })
    finishedOn: number;
}

export class FailedJobListDto {
    @ApiProperty({ description: 'Total number of failed jobs in the queue' })
    total: number;

    @ApiProperty({ type: [FailedJobDto] })
    items: FailedJobDto[];
}

export class FailedJobGroupDto {
    @ApiProperty({ description: 'The failure reason text used as the grouping key' })
    reason: string;

    @ApiProperty({ description: 'Number of jobs that share this failure reason' })
    count: number;

    @ApiProperty({ type: [String], description: 'Up to 5 representative job IDs from this group' })
    sampleJobIds: string[];
}

export class FailedJobGroupListDto {
    @ApiProperty({ type: [FailedJobGroupDto] })
    groups: FailedJobGroupDto[];
}

// ---------------------------------------------------------------------------
// Retry request / response bodies
// ---------------------------------------------------------------------------

export class RetryJobBodyDto {
    @ApiPropertyOptional({
        description:
            'When true, bypass the 3-retry budget cap and force a retry regardless of manualRetryCount.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    force?: boolean;
}

export class RetryAllFailedBodyDto {
    @ApiPropertyOptional({
        description:
            'Only retry jobs older than this many milliseconds (based on job finishedOn timestamp).',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    olderThanMs?: number;

    @ApiPropertyOptional({
        description: 'Maximum number of failed jobs to retry in a single call.',
        default: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(1000)
    limit?: number = 100;

    @ApiPropertyOptional({
        description: 'When true, bypass the per-job manual retry budget.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    force?: boolean;
}

export class RetryErrorItemDto {
    @ApiProperty()
    jobId: string;

    @ApiProperty()
    reason: string;
}

export class RetryAllFailedResultDto {
    @ApiProperty({ description: 'Number of jobs successfully queued for retry' })
    retried: number;

    @ApiProperty({ description: 'Number of jobs skipped due to retry budget exhaustion' })
    skipped: number;

    @ApiProperty({ type: [RetryErrorItemDto], description: 'Jobs that could not be retried due to unexpected errors' })
    errors: RetryErrorItemDto[];
}

// ---------------------------------------------------------------------------
// Sync-status
// ---------------------------------------------------------------------------

export class TopicSyncItemDto {
    @ApiProperty({ description: 'Hedera topic ID, e.g. "0.0.12345"' })
    topicId: string;

    @ApiProperty({ description: 'Number of HCS messages processed for this topic' })
    messageCount: number;

    @ApiProperty({ description: 'Whether there are more messages to fetch' })
    hasNext: boolean;

    @ApiProperty({ description: 'Hedera consensus timestamp of the last synced message (seconds.nanoseconds)' })
    lastUpdate: string;

    @ApiProperty({ description: 'Sync status code for this topic', example: 'SYNCED' })
    status: string;
}

export class TokenSyncItemDto {
    @ApiProperty({ description: 'Hedera token ID, e.g. "0.0.99999"' })
    tokenId: string;

    @ApiProperty({ description: 'Highest NFT serial number processed' })
    serialNumber: number;

    @ApiProperty({ description: 'Whether there are more NFT serials to fetch' })
    hasNext: boolean;

    @ApiPropertyOptional({ description: 'Token type', example: 'NON_FUNGIBLE_UNIQUE', nullable: true })
    type: string | null;
}

export class SyncStatusDto {
    @ApiProperty({
        description: 'ISO-8601 datetime of the most recently synced message, or null if none',
        nullable: true,
    })
    lastSyncedAt: string | null;

    @ApiProperty({ description: 'Approximate lag in seconds between last sync and now' })
    lagSeconds: number;

    @ApiProperty({ description: 'Total number of topics tracked in topic_cache' })
    totalTopics: number;

    @ApiProperty({ description: 'Topics fully caught up (hasNext = false)' })
    syncedTopics: number;

    @ApiProperty({ description: 'Total HCS messages indexed across all topics' })
    totalMessages: number;

    @ApiProperty({ type: [TopicSyncItemDto], description: 'Top 50 topics by message count' })
    topics: TopicSyncItemDto[];

    @ApiProperty({ type: [TokenSyncItemDto], description: 'Up to 50 tracked tokens' })
    tokens: TokenSyncItemDto[];
}
