import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { MATERIALIZED_VIEWS } from '@shared/materialized-views';

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
     * Ensures all registered materialized views exist on startup.
     * Uses CREATE MATERIALIZED VIEW IF NOT EXISTS — safe to run repeatedly.
     */
    async onModuleInit(): Promise<void> {
        for (const mv of MATERIALIZED_VIEWS) {
            try {
                await this.dataSource.query(mv.createSql);
                if (mv.indexSql) {
                    await this.dataSource.query(mv.indexSql);
                }
                this.logger.log(`Ensured materialized view: ${mv.name}`);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to ensure materialized view ${mv.name}: ${message}`);
            }
        }
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
