import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import configuration from '@shared/config/configuration';
import { getDatabaseConfig } from '@shared/config/database.config';
import { getRedictConfig } from '@shared/config/redict.config';
import { QUEUE_NAMES, getActiveQueues, getQueueRegistrations } from '@shared/config/bullmq.config';

// Modules
import { MappingModule } from './mapping/mapping.module';

// Services
import { HederaService } from './services/hedera.service';
import { IpfsService } from './services/ipfs.service';
import { ProjectMapperService } from './services/project-mapper.service';
import { TopicClassifierService } from './project-mapper/topic-classifier';
import { DynamicTopicResolver } from './project-mapper/resolvers/dynamic-topic.resolver';
import { CsRefResolver } from './project-mapper/resolvers/cs-ref.resolver';
import { RelationshipsResolver } from './project-mapper/resolvers/relationships.resolver';
import { ProjectSchemaResolver } from './project-mapper/resolvers/project-schema.resolver';
import { ProjectKeyResolverChain } from './project-mapper/resolvers/resolver-chain.service';
import { ReverseGeoService } from './services/reverse-geo.service';
import { POLICY_ZIP_STORAGE } from './services/storage/policy-zip-storage.interface';
import { LocalPolicyZipStorage } from './services/storage/local-policy-zip-storage.service';

// Processors
import { TopicSyncProcessor } from './processors/topic-sync.processor';
import { TopicSyncPriorityProcessor } from './processors/topic-sync-priority.processor';
import { MessageProcessProcessor } from './processors/message-process.processor';
import { TokenSyncProcessor } from './processors/token-sync.processor';
import { RetireSyncProcessor } from './processors/retire-sync.processor';
import { IpfsFetchProcessor } from './processors/ipfs-fetch.processor';
import { PolicyDecodeProcessor } from './processors/policy-decode.processor';
import { MvRefreshProcessor } from './processors/mv-refresh.processor';
import { BusinessViewBuilderProcessor } from './processors/business-view-builder.processor';
import { PolicyStatusProcessor } from './processors/policy-status.processor';
import { ProjectReparseProcessor } from './processors/project-reparse.processor';

// Schedulers
import { SyncSchedulerService } from './schedulers/sync-scheduler.service';

// Services (extended)
import { QueueAutoscalerService } from './services/queue-autoscaler.service';

/**
 * Maps queue names to the processor classes that handle them.
 * Only processors for active queues will be registered.
 */
const PROCESSOR_MAP: Record<string, any> = {
    [QUEUE_NAMES.TOPIC_SYNC]: TopicSyncProcessor,
    [QUEUE_NAMES.TOPIC_SYNC_PRIORITY]: TopicSyncPriorityProcessor,
    [QUEUE_NAMES.MESSAGE_PARSE]: MessageProcessProcessor,
    [QUEUE_NAMES.TOKEN_SYNC]: TokenSyncProcessor,
    [QUEUE_NAMES.RETIRE_SYNC]: RetireSyncProcessor,
    [QUEUE_NAMES.IPFS_FETCH]: IpfsFetchProcessor,
    [QUEUE_NAMES.POLICY_DECODE]: PolicyDecodeProcessor,
    [QUEUE_NAMES.MV_REFRESH]: MvRefreshProcessor,
    [QUEUE_NAMES.BUSINESS_VIEW_BUILD]: BusinessViewBuilderProcessor,
    [QUEUE_NAMES.PROJECT_REPARSE]: ProjectReparseProcessor,
    [QUEUE_NAMES.POLICY_STATUS]: PolicyStatusProcessor,
};

/**
 * Queues each processor ENQUEUES into (beyond the one it consumes).
 *
 * A role-partitioned worker still has to be able to produce into queues it does
 * not itself drain — a message-parse worker enqueues IPFS and policy-decode work
 * for other roles to pick up. Registering only the union of what this instance
 * consumes and produces keeps a role worker from opening a connection per queue
 * for the ones it never touches.
 */
const ENQUEUE_TARGETS: Record<string, string[]> = {
    [QUEUE_NAMES.TOPIC_SYNC]: [QUEUE_NAMES.MESSAGE_PARSE, QUEUE_NAMES.TOPIC_SYNC],
    [QUEUE_NAMES.TOPIC_SYNC_PRIORITY]: [
        QUEUE_NAMES.MESSAGE_PARSE, QUEUE_NAMES.TOPIC_SYNC_PRIORITY, QUEUE_NAMES.TOPIC_SYNC,
    ],
    [QUEUE_NAMES.MESSAGE_PARSE]: [
        QUEUE_NAMES.IPFS_FETCH, QUEUE_NAMES.POLICY_DECODE, QUEUE_NAMES.TOKEN_SYNC,
        QUEUE_NAMES.TOPIC_SYNC, QUEUE_NAMES.TOPIC_SYNC_PRIORITY, QUEUE_NAMES.POLICY_STATUS,
    ],
    [QUEUE_NAMES.POLICY_DECODE]: [QUEUE_NAMES.IPFS_FETCH],
    [QUEUE_NAMES.TOKEN_SYNC]: [QUEUE_NAMES.TOKEN_SYNC],
    [QUEUE_NAMES.RETIRE_SYNC]: [QUEUE_NAMES.RETIRE_SYNC],
    [QUEUE_NAMES.IPFS_FETCH]: [],
    [QUEUE_NAMES.MV_REFRESH]: [],
    [QUEUE_NAMES.BUSINESS_VIEW_BUILD]: [],
    [QUEUE_NAMES.PROJECT_REPARSE]: [],
    [QUEUE_NAMES.POLICY_STATUS]: [],
};

/** Every queue the scheduler seeds into; it holds a producer for each. */
const SCHEDULER_QUEUES: string[] = [
    QUEUE_NAMES.TOPIC_SYNC, QUEUE_NAMES.TOPIC_SYNC_PRIORITY, QUEUE_NAMES.MESSAGE_PARSE,
    QUEUE_NAMES.TOKEN_SYNC, QUEUE_NAMES.RETIRE_SYNC, QUEUE_NAMES.MV_REFRESH,
    QUEUE_NAMES.BUSINESS_VIEW_BUILD, QUEUE_NAMES.POLICY_DECODE, QUEUE_NAMES.IPFS_FETCH,
    QUEUE_NAMES.POLICY_STATUS,
];

@Module({})
export class WorkerModule {
    static register(): DynamicModule {
        const activeQueues = getActiveQueues();

        // Only register processors for queues this instance handles
        const activeProcessors = activeQueues
            .map(q => PROCESSOR_MAP[q])
            .filter(Boolean);

        // The scheduler seeds jobs and owns the repeatables. It is leader-elected,
        // so extra instances are harmless, but in a role-partitioned deployment
        // there is no reason for every role to carry it — pin it to one role with
        // SCHEDULER_ENABLED=false everywhere else. Default true keeps the
        // single-worker deployment behaving exactly as before.
        const schedulerEnabled = (process.env.SCHEDULER_ENABLED ?? 'true') !== 'false'
            && activeQueues.some(q => q.startsWith('mirror-node'));

        // Union of what this instance consumes and what it produces into.
        const requiredQueues = new Set<string>(activeQueues);
        for (const queue of activeQueues) {
            for (const target of ENQUEUE_TARGETS[queue] ?? []) requiredQueues.add(target);
        }
        if (schedulerEnabled) {
            for (const queue of SCHEDULER_QUEUES) requiredQueues.add(queue);
        }

        const queueRegistrations = getQueueRegistrations()
            .filter(registration => requiredQueues.has(registration.name));

        return {
            module: WorkerModule,
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [configuration],
                }),

                TypeOrmModule.forRootAsync({
                    useFactory: () => getDatabaseConfig(),
                }),

                BullModule.forRootAsync({
                    useFactory: () => {
                        // Strip keyPrefix — BullMQ manages its own 'bull:' namespace
                        // (queue.registry does the same). Spread the rest so the worker's
                        // queue connections inherit retryStrategy + reconnectOnError and
                        // survive a Redict restart/redeploy (the ENOTFOUND/LOADING window)
                        // instead of throwing until the process is restarted.
                        const { keyPrefix: _kp, ...connection } = getRedictConfig();
                        return { connection };
                    },
                }),

                // Register the queues this instance consumes or produces into,
                // carrying the full default job options. Retention keeps the
                // completed/failed sets from growing until Redict OOMs; attempts
                // and backoff mean a transient mirror-node/IPFS failure retries
                // instead of silently dropping that unit of work. Per-job opts
                // still override (the poll chains pass removeOnComplete: true).
                BullModule.registerQueue(...queueRegistrations),

                // Mapping pipeline module
                MappingModule,
            ],
            providers: [
                // Redict pub/sub client for event publishing
                {
                    provide: 'REDICT_PUB',
                    useFactory: () => {
                        // Strip keyPrefix to preserve this client's unprefixed keys
                        // (autoscaler) and channels ('se:events'); spread the rest so it
                        // inherits the shared retry/reconnect resilience settings.
                        const { keyPrefix: _kp, ...connection } = getRedictConfig();
                        return new Redis(connection);
                    },
                },

                // Services (always available for processors)
                HederaService,
                IpfsService,
                ReverseGeoService,
                ProjectMapperService,
                // Project-key resolver chain (M1→M4) + its dependencies.
                TopicClassifierService,
                DynamicTopicResolver,
                CsRefResolver,
                RelationshipsResolver,
                ProjectSchemaResolver,
                ProjectKeyResolverChain,
                { provide: POLICY_ZIP_STORAGE, useClass: LocalPolicyZipStorage },

                // Only processors for active queues
                ...activeProcessors,

                // Scheduler — see schedulerEnabled above.
                ...(schedulerEnabled ? [SyncSchedulerService] : []),

                // Autoscaler — always registered; uses @Optional() for processor
                // injections so it gracefully handles partial processor sets.
                QueueAutoscalerService,
            ],
        };
    }
}
