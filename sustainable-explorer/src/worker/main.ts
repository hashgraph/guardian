import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WorkerModule } from './worker.module';
import { getActiveQueues } from '@shared/config/bullmq.config';
import { ensureDatabaseExists } from '@shared/config/database.config';
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

    const app = await NestFactory.createApplicationContext(
        WorkerModule.register(),
        {
            logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        },
    );

    // Bootstrap schema modifications that TypeORM decorators can't express
    // (tsvector generated columns, GIN indexes, trigram indexes)
    try {
        const dataSource = app.get(DataSource);
        await bootstrapSchema(dataSource);
        logger.log('Schema bootstrap complete (tsvector + GIN + trigram indexes)');
    } catch (err) {
        logger.error(`Schema bootstrap failed: ${err}`);
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
