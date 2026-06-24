import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { GuardianSyncModule } from './guardian-sync.module';
import { getGuardianInstances } from '@shared/config/configuration';
import { ensureDatabaseExists, getDatabaseConfig } from '@shared/config/database.config';
import { resolveNestLogLevels } from '@shared/config/log-level';
import { bootstrapSchema } from '@shared/database/schema-bootstrap';

async function bootstrap() {
    const logger = new Logger('SustainableExplorer:GuardianSync');
    const instances = getGuardianInstances();

    logger.log(
        `Starting guardian-sync for ${instances.length} instance(s): ` +
        `${instances.map(i => i.network).join(', ') || '(none configured)'}`,
    );

    // Ensure the network DB exists (idempotent; the paired worker normally owns it).
    try {
        await ensureDatabaseExists();
        logger.log('Database check complete');
    } catch (err) {
        logger.error(`Database ensure failed: ${err}`);
    }

    // Ensure tables exist (idempotent). synchronize is OFF for guardian-sync — the
    // worker owns schema sync — so we run bootstrapSchema ONCE to guarantee
    // guardian_event_log is present even if guardian-sync boots before its worker.
    // Errors are logged, not fatal: a concurrent worker bootstrap may own the DDL.
    try {
        const bootstrapDs = new DataSource(
            getDatabaseConfig(undefined, { synchronize: false }) as DataSourceOptions,
        );
        await bootstrapDs.initialize();
        try {
            await bootstrapSchema(bootstrapDs);
            logger.log('Schema bootstrap complete');
        } finally {
            await bootstrapDs.destroy();
        }
    } catch (err) {
        logger.warn(`Schema bootstrap skipped/failed (worker may own it): ${err}`);
    }

    const app = await NestFactory.createApplicationContext(
        GuardianSyncModule.register(),
        {
            logger: resolveNestLogLevels(),
        },
    );

    // Graceful shutdown — closing the context fires GuardianEventSubscriber's
    // OnModuleDestroy (aborts streams, releases leadership).
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
        process.on(signal, async () => {
            logger.log(`Received ${signal}, shutting down gracefully...`);
            await app.close();
            process.exit(0);
        });
    }

    logger.log('Sustainable Explorer guardian-sync is running');
    logger.log(`Hedera network: ${process.env.HEDERA_NET || 'testnet'}`);
}

bootstrap();
