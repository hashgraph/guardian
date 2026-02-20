/**
 * Migration launch mode.
 */
export enum MigrationMode {
    START_NEW = 'start_new',
    RESUME = 'resume',
    RETRY_FAILED = 'retry_failed',
}

/**
 * Migration run status.
 */
export enum MigrationRunStatus {
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    STOPPED = 'stopped',
}

/**
 * Migration summary item for a single entity type.
 */
export interface MigrationSummaryItem {
    total: number;
    success: number;
    failed: number;
    cursorLastId?: string;
}

/**
 * Migration summary grouped by entity type.
 * Includes aggregated "total" bucket.
 */
export interface MigrationRunSummary {
    total?: MigrationSummaryItem;
    [entityType: string]: MigrationSummaryItem | undefined;
}

/**
 * Failed migration item.
 */
export interface MigrationFailedItem {
    srcPolicyId: string;
    dstPolicyId: string;
    entityType: string;
    srcEntityId: string;
    runId: string;
    attemptCount: number;
    errorCode?: string;
    errorMessage?: string;
    firstFailedAt: string;
    lastFailedAt: string;
}

/**
 * Migration run status payload.
 */
export interface MigrationRunStatusItem {
    runId: string;
    srcPolicyId: string;
    dstPolicyId: string;
    status: MigrationRunStatus | string;
    startedAt?: string | Date | null;
    finishedAt?: string | Date | null;
    summary: MigrationRunSummary;
    failedItems?: MigrationFailedItem[];
}

/**
 * Migration status response.
 */
export interface MigrationStatusResponse {
    items: MigrationRunStatusItem[];
}

/**
 * Migration runs response.
 */
export interface MigrationRunsResponse extends MigrationStatusResponse {
    count: number;
    pageIndex: number;
    pageSize: number;
}
