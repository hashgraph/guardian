import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { WorkerModule } from './worker.module';
import { getActiveQueues } from '@shared/config/bullmq.config';
import { ensureDatabaseExists, getDatabaseConfig } from '@shared/config/database.config';
import { bootstrapSchema } from '@shared/database/schema-bootstrap';

async function bootstrap() {
    const logger = new Logger('SustainableExplorer:Worker');
    const activeQueues = getActiveQueues();

    logger.log(`Starting worker with queues: ${activeQueues.join(', ')}`);

    // Create database if it doesn't exist (connects to 'postgres' db to issue CREATE DATABASE)
    try {
        await ensureDatabaseExists();
        logger.log('Database check complete');
    } catch (err) {
        logger.error(`Database ensure failed: ${err}`);
    }

    // Bootstrap schema (tsvector columns, GIN/trigram indexes, policy_decode_status, etc.)
    // BEFORE Nest starts — onModuleInit hooks (e.g. SyncSchedulerService) query these
    // tables, so they must exist before the application context is created.
    try {
        const bootstrapDs = new DataSource(getDatabaseConfig() as DataSourceOptions);
        await bootstrapDs.initialize();
        try {
            await bootstrapSchema(bootstrapDs);
            logger.log('Schema bootstrap complete (tsvector + GIN + trigram + policy_decode_status)');
        } finally {
            await bootstrapDs.destroy();
        }
    } catch (err) {
        logger.error(`Schema bootstrap failed: ${err}`);
        throw err;
    }

    const app = await NestFactory.createApplicationContext(
        WorkerModule.register(),
        {
            logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        },
    );

    // Re-run bootstrap AFTER TypeORM synchronize. TypeORM drops indexes it
    // doesn't see on entities (e.g. our partial unique index on business_view
    // (projectKey) WHERE viewType='PROJECT'). Bootstrap is idempotent, so the
    // second run reinstates anything synchronize stripped.
    try {
        const ds = app.get(DataSource);
        await bootstrapSchema(ds);
        logger.log('Schema bootstrap re-run after synchronize (indexes reinstated)');
    } catch (err) {
        logger.error(`Post-synchronize bootstrap failed: ${err}`);
    }

    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
        process.on(signal, async () => {
            logger.log(`Received ${signal}, shutting down gracefully...`);
            await app.close();
            process.exit(0);
        });
    }

    logger.log('Sustainable Explorer Worker is running');
    logger.log(`Hedera network: ${process.env.HEDERA_NET || 'testnet'}`);
    logger.log(`Active queues: ${activeQueues.join(', ')}`);
}

bootstrap();
