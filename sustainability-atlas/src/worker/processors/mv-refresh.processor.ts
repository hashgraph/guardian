import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { QUEUE_NAMES, getWorkerOptions } from '@shared/config/bullmq.config';
import { MATERIALIZED_VIEWS, MaterializedViewDefinition } from '@shared/materialized-views';

@Processor(QUEUE_NAMES.MV_REFRESH, getWorkerOptions(QUEUE_NAMES.MV_REFRESH))
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
     * Replicas are serialized on a Postgres advisory lock. IF NOT EXISTS alone
     * is not enough here: the recreate path issues DROP ... CASCADE before
     * CREATE, so two replicas arriving together can each drop a view the other
     * just built, and every endpoint joining it fails for that window. The lock
     * is held for the whole pass, so the second replica finds the definitions
     * already current and takes the cheap REFRESH path instead.
     */
    async onModuleInit(): Promise<void> {
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        try {
            // try_ rather than a blocking acquire: this runs in onModuleInit, so
            // waiting on the lock blocks worker startup entirely. A holder that
            // leaks its connection (a killed process, a test suite that does not
            // tear down) would then wedge every future boot behind a lock nobody
            // is going to release. Skipping is also the correct semantic — if
            // another instance is preparing the views, this one has nothing to do.
            const [lock]: Array<{ locked: boolean }> = await runner.query(
                `SELECT pg_try_advisory_lock(hashtext('se:mv-init')) AS locked`,
            );
            if (!lock?.locked) {
                this.logger.log('Materialized views are being prepared elsewhere — skipping');
                return;
            }
            await this.prepareViews();
        } finally {
            await runner
                .query(`SELECT pg_advisory_unlock(hashtext('se:mv-init'))`)
                .catch(() => {});
            await runner.release();
        }
    }

    private async prepareViews(): Promise<void> {
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

        const results: Record<string, 'success' | 'failed' | 'skipped'> = {};

        for (const mv of MATERIALIZED_VIEWS) {
            // Per-view advisory lock: the queue's concurrency only serializes
            // within one process, so a second worker (or an autoscaled
            // concurrency bump) can start a refresh while the previous tick's
            // is still running. Overlapping REFRESH CONCURRENTLY transactions
            // hold back the vacuum horizon and bloat the view — one grew to
            // 412MB for ~20k rows. Held on a dedicated connection because the
            // lock belongs to the session that took it; releasing from a
            // different pooled connection would leak it and wedge the view.
            const runner = this.dataSource.createQueryRunner();
            await runner.connect();
            let locked = false;
            try {
                const [lock]: Array<{ locked: boolean }> = await runner.query(
                    `SELECT pg_try_advisory_lock(hashtext('se:mv-refresh:' || $1)) AS locked`,
                    [mv.name],
                );
                locked = lock?.locked ?? false;
                if (!locked) {
                    results[mv.name] = 'skipped';
                    this.logger.log(
                        `Materialized view ${mv.name} is already being refreshed elsewhere — skipping`,
                    );
                    continue;
                }

                // Use CONCURRENTLY to avoid blocking readers.
                // Requires a unique index (created in onModuleInit).
                await runner.query(
                    `REFRESH MATERIALIZED VIEW CONCURRENTLY ${mv.name}`,
                );
                results[mv.name] = 'success';
                this.logger.debug(`Refreshed materialized view: ${mv.name}`);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                results[mv.name] = 'failed';
                this.logger.error(`Failed to refresh materialized view ${mv.name}: ${message}`);
            } finally {
                if (locked) {
                    await runner
                        .query(`SELECT pg_advisory_unlock(hashtext('se:mv-refresh:' || $1))`, [mv.name])
                        .catch(() => {});
                }
                await runner.release();
            }
        }

        await this.redis.publish('se:events', JSON.stringify({
            type: 'materialized-views-refreshed',
            views: results,
            timestamp: new Date().toISOString(),
        }));

        const outcomes = Object.values(results);
        const successCount = outcomes.filter((r) => r === 'success').length;
        const skippedCount = outcomes.filter((r) => r === 'skipped').length;
        this.logger.log(
            `Materialized views refresh complete: ${successCount}/${MATERIALIZED_VIEWS.length} succeeded (${skippedCount} skipped)`,
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
