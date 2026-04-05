import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';

@Processor(QUEUE_NAMES.MV_REFRESH)
export class MvRefreshProcessor extends WorkerHost {
    private readonly logger = new Logger(MvRefreshProcessor.name);

    // Materialized views to refresh. Add entries here as views are created.
    // Views must be created with CREATE MATERIALIZED VIEW before they can be refreshed.
    private static readonly MATERIALIZED_VIEWS: string[] = [];

    constructor(
        private readonly dataSource: DataSource,
        @Inject('REDICT_PUB') private readonly redis: Redis,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        this.logger.log('Refreshing materialized views...');

        const results: Record<string, boolean> = {};

        for (const viewName of MvRefreshProcessor.MATERIALIZED_VIEWS) {
            try {
                await this.dataSource.query(
                    `REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`,
                );
                results[viewName] = true;
                this.logger.debug(`Refreshed materialized view: ${viewName}`);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                results[viewName] = false;
                this.logger.error(`Failed to refresh materialized view ${viewName}: ${message}`);
            }
        }

        // Publish event
        await this.redis.publish('se:events', JSON.stringify({
            type: 'materialized-views-refreshed',
            views: results,
            timestamp: new Date().toISOString(),
        }));

        const successCount = Object.values(results).filter(Boolean).length;
        this.logger.log(
            `Materialized views refresh complete: ${successCount}/${MvRefreshProcessor.MATERIALIZED_VIEWS.length} succeeded`,
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
