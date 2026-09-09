import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { MATERIALIZED_VIEWS, MaterializedViewDefinition } from '@shared/materialized-views';

@Processor(QUEUE_NAMES.MV_REFRESH)
export class MvRefreshProcessor extends WorkerHost implements OnModuleInit {
    private readonly logger = new Logger(MvRefreshProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @Inject('REDICT_PUB') private readonly redis: Redis,
    ) {
        super();
    }

    /**
     * Ensures every registered materialized view exists and is current,
     * without unconditionally dropping+recreating on every boot — expensive
     * against large (testnet-scale) source tables, and a failure mid-rebuild
     * used to leave the view absent, breaking every endpoint that joins it.
     *
     * A view is only (re)created when it doesn't exist yet or its definition
     * (createSql + indexSql) changed since the hash last recorded in
     * mv_registry; otherwise it's just REFRESHed with current data, which is
     * far cheaper than a schema rebuild. On a fresh deploy (no mv_registry
     * rows, no views) every view takes the create path, same as before.
     *
     * `createSql`/`indexSql` already use IF NOT EXISTS (see *.mv.ts), so this
     * is also safe if multiple worker replicas race on deploy: Postgres
     * serializes the DDL and the loser's statement becomes a no-op.
     */
    async onModuleInit(): Promise<void> {
        await this.ensureMvRegistryTable();

        for (const mv of MATERIALIZED_VIEWS) {
            const hash = this.hashDefinition(mv);
            try {
                const [exists, storedHash] = await Promise.all([
                    this.viewExists(mv.name),
                    this.getStoredHash(mv.name),
                ]);

                if (!exists || storedHash !== hash) {
                    await this.recreate(mv, hash);
                    this.logger.log(
                        `${exists ? 'Definition changed — recreated' : 'Created'} materialized view: ${mv.name}`,
                    );
                } else {
                    await this.dataSource.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${mv.name}`);
                    this.logger.log(`Refreshed materialized view (unchanged definition): ${mv.name}`);
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to prepare materialized view ${mv.name}: ${message}`);
            }
        }
    }

    private async ensureMvRegistryTable(): Promise<void> {
        await this.dataSource.query(`
            CREATE TABLE IF NOT EXISTS mv_registry (
                name text PRIMARY KEY,
                definition_hash text NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT now()
            )
        `);
    }

    private hashDefinition(mv: MaterializedViewDefinition): string {
        return createHash('sha256').update(mv.createSql + (mv.indexSql ?? '')).digest('hex');
    }

    private async viewExists(name: string): Promise<boolean> {
        const rows: Array<{ exists: boolean }> = await this.dataSource.query(
            `SELECT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = $1) AS exists`,
            [name],
        );
        return rows[0]?.exists ?? false;
    }

    private async getStoredHash(name: string): Promise<string | null> {
        const rows: Array<{ definition_hash: string }> = await this.dataSource.query(
            `SELECT definition_hash FROM mv_registry WHERE name = $1`,
            [name],
        );
        return rows[0]?.definition_hash ?? null;
    }

    /** Drops any stale version (IF EXISTS — safe even if a racing replica already dropped it), recreates, and records the new hash. */
    private async recreate(mv: MaterializedViewDefinition, hash: string): Promise<void> {
        await this.dataSource.query(`DROP MATERIALIZED VIEW IF EXISTS ${mv.name} CASCADE`);
        await this.dataSource.query(mv.createSql);
        if (mv.indexSql) {
            await this.dataSource.query(mv.indexSql);
        }
        await this.dataSource.query(
            `INSERT INTO mv_registry (name, definition_hash, updated_at)
             VALUES ($1, $2, now())
             ON CONFLICT (name) DO UPDATE SET definition_hash = EXCLUDED.definition_hash, updated_at = now()`,
            [mv.name, hash],
        );
    }

    async process(job: Job): Promise<void> {
        this.logger.log('Refreshing materialized views...');

        const results: Record<string, boolean> = {};

        for (const mv of MATERIALIZED_VIEWS) {
            try {
                // Use CONCURRENTLY to avoid blocking readers.
                // Requires a unique index (created in onModuleInit).
                await this.dataSource.query(
                    `REFRESH MATERIALIZED VIEW CONCURRENTLY ${mv.name}`,
                );
                results[mv.name] = true;
                this.logger.debug(`Refreshed materialized view: ${mv.name}`);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                results[mv.name] = false;
                this.logger.error(`Failed to refresh materialized view ${mv.name}: ${message}`);
            }
        }

        await this.redis.publish('se:events', JSON.stringify({
            type: 'materialized-views-refreshed',
            views: results,
            timestamp: new Date().toISOString(),
        }));

        const successCount = Object.values(results).filter(Boolean).length;
        this.logger.log(
            `Materialized views refresh complete: ${successCount}/${MATERIALIZED_VIEWS.length} succeeded`,
        );
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error): void {
        this.logger.error(
            `MV refresh job ${job.id} failed: ${error.message}`,
            error.stack,
        );
    }
}
