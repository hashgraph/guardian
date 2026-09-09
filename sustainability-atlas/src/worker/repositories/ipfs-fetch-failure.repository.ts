import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Thin repository for the ipfs_fetch_failure table.
 * Uses raw SQL via DataSource.query() — consistent with how all other worker
 * processors access the database (no TypeORM entity manager).
 *
 * The table is created lazily via ensureTable() in the processor's onModuleInit.
 */
export class IpfsFetchFailureRepository {
    private readonly logger = new Logger(IpfsFetchFailureRepository.name);

    constructor(private readonly dataSource: DataSource) {}

    /**
     * Creates the ipfs_fetch_failure table if it does not already exist.
     * Safe to call on every startup (idempotent via IF NOT EXISTS).
     */
    async ensureTable(): Promise<void> {
        await this.dataSource.query(`
            CREATE TABLE IF NOT EXISTS ipfs_fetch_failure (
                cid text PRIMARY KEY,
                "lastError" text NOT NULL,
                "errorCategory" varchar(20) NOT NULL DEFAULT 'unknown',
                "attemptCount" int NOT NULL DEFAULT 0,
                "manualRetryCount" int NOT NULL DEFAULT 0,
                "firstFailedAt" timestamptz NOT NULL,
                "lastFailedAt" timestamptz NOT NULL,
                "messageTimestamp" text
            )
        `);
        this.logger.log('Ensured ipfs_fetch_failure table exists');
    }

    /**
     * Inserts or updates a failure record for the given CID.
     * On conflict: increments attemptCount and updates lastError, errorCategory, lastFailedAt.
     * firstFailedAt is never updated — it records the original failure time.
     */
    async upsertFailure(
        cid: string,
        lastError: string,
        errorCategory: string,
        messageTimestamp: string | null,
    ): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO ipfs_fetch_failure
                (cid, "lastError", "errorCategory", "attemptCount", "firstFailedAt", "lastFailedAt", "messageTimestamp")
             VALUES ($1, $2, $3, 1, NOW(), NOW(), $4)
             ON CONFLICT (cid) DO UPDATE SET
                "lastError"       = EXCLUDED."lastError",
                "errorCategory"   = EXCLUDED."errorCategory",
                "attemptCount"    = ipfs_fetch_failure."attemptCount" + 1,
                "lastFailedAt"    = NOW()`,
            [cid, lastError, errorCategory, messageTimestamp],
        );
    }

    /**
     * Removes the failure record for the given CID.
     * Called when a previously-failing CID is successfully fetched (recovery).
     * No-op if no record exists.
     */
    async deleteFailure(cid: string): Promise<void> {
        await this.dataSource.query(
            `DELETE FROM ipfs_fetch_failure WHERE cid = $1`,
            [cid],
        );
    }
}
