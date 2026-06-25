import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import configuration from '@shared/config/configuration';
import { getDatabaseConfig } from '@shared/config/database.config';
import { getRedictConfig } from '@shared/config/redict.config';
import { QUEUE_NAMES, getQueueConfigs } from '@shared/config/bullmq.config';

import { GuardianEventLogService } from './guardian-event-log.service';
import { GuardianEventRouter } from './guardian-event-router';
import { GuardianEventSubscriber } from './guardian-event-subscriber.service';

// guardian-sync only ENQUEUES into the worker's existing per-network queues —
// the worker owns/drains them. These are the only queues the event router touches.
const PRODUCER_QUEUES = [
    QUEUE_NAMES.TOPIC_SYNC,
    QUEUE_NAMES.IPFS_FETCH,
    QUEUE_NAMES.TOKEN_SYNC,
] as const;

/**
 * Headless module for the opt-in guardian-sync process. Mirrors
 * WorkerModule.register() but provides no processors/scheduler: it only
 * subscribes to a Guardian Application Events Module stream and enqueues
 * targeted jobs onto the worker's queues.
 *
 * synchronize is FORCED off here — the worker owns schema synchronization;
 * guardian-sync only needs its tables to already exist (ensured idempotently
 * by bootstrapSchema in main.ts).
 */
@Module({})
export class GuardianSyncModule {
    static register(): DynamicModule {
        // Reuse the worker's per-queue retention so enqueued jobs are cleaned up
        // (Redict-OOM lesson) — same source of truth as worker.module.
        const retentionByName = new Map(
            getQueueConfigs().map(q => [q.name, {
                removeOnComplete: q.defaultJobOptions.removeOnComplete,
                removeOnFail: q.defaultJobOptions.removeOnFail,
            }]),
        );

        return {
            module: GuardianSyncModule,
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [configuration],
                }),

                TypeOrmModule.forRootAsync({
                    useFactory: () => getDatabaseConfig(undefined, { synchronize: false }),
                }),

                BullModule.forRootAsync({
                    useFactory: () => {
                        const redictConfig = getRedictConfig();
                        return {
                            connection: {
                                host: redictConfig.host,
                                port: redictConfig.port,
                                password: redictConfig.password,
                                db: redictConfig.db,
                            },
                        };
                    },
                }),

                BullModule.registerQueue(
                    ...PRODUCER_QUEUES.map(name => ({
                        name,
                        defaultJobOptions: retentionByName.get(name),
                    })),
                ),
            ],
            providers: [
                // Redict client for leader election (same factory as worker.module).
                {
                    provide: 'REDICT_PUB',
                    useFactory: () => {
                        const config = getRedictConfig();
                        return new Redis({
                            host: config.host,
                            port: config.port,
                            password: config.password,
                            db: config.db,
                            maxRetriesPerRequest: null,
                            enableReadyCheck: false,
                        });
                    },
                },

                GuardianEventLogService,
                GuardianEventRouter,
                GuardianEventSubscriber,
            ],
        };
    }
}
