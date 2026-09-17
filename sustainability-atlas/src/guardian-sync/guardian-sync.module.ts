import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import configuration from '@shared/config/configuration';
import { getDatabaseConfig } from '@shared/config/database.config';
import { getRedictConfig } from '@shared/config/redict.config';
import { QUEUE_NAMES, getQueueRegistrations } from '@shared/config/bullmq.config';

import { GuardianEventLogService } from './guardian-event-log.service';
import { GuardianEventRouter } from './guardian-event-router';
import { GuardianEventSubscriber } from './guardian-event-subscriber.service';

// guardian-sync only ENQUEUES into the worker's existing per-network queues —
// the worker owns/drains them. These are the only queues the event router touches.
const PRODUCER_QUEUES = [
    QUEUE_NAMES.TOPIC_SYNC,
    QUEUE_NAMES.TOPIC_SYNC_PRIORITY,
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
        // Reuse the worker's full per-queue job options (retention + attempts +
        // backoff) so enqueued jobs are cleaned up (Redict-OOM lesson) and retry
        // like the worker's own — same source of truth as worker.module.
        const registrationsByName = new Map(
            getQueueRegistrations().map(r => [r.name, r]),
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
                        // Strip keyPrefix (BullMQ owns its 'bull:' namespace) and
                        // spread the rest, so these connections inherit the shared
                        // retryStrategy + reconnectOnError and survive a Redict
                        // restart instead of throwing until this process restarts.
                        const { keyPrefix: _kp, ...connection } = getRedictConfig();
                        return { connection };
                    },
                }),

                BullModule.registerQueue(
                    ...PRODUCER_QUEUES.map(name =>
                        registrationsByName.get(name) ?? { name },
                    ),
                ),
            ],
            providers: [
                // Redict client for leader election (same factory as worker.module).
                {
                    provide: 'REDICT_PUB',
                    useFactory: () => {
                        // Strip keyPrefix to keep this client's leader-lock keys
                        // unprefixed (they must match the worker's); spread the
                        // rest for the shared retry/reconnect resilience.
                        const { keyPrefix: _kp, ...connection } = getRedictConfig();
                        return new Redis(connection);
                    },
                },

                GuardianEventLogService,
                GuardianEventRouter,
                GuardianEventSubscriber,
            ],
        };
    }
}
