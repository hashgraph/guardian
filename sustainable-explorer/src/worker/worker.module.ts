import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import configuration from '@shared/config/configuration';
import { getDatabaseConfig } from '@shared/config/database.config';
import { getRedictConfig } from '@shared/config/redict.config';
import { QUEUE_NAMES, getActiveQueues } from '@shared/config/bullmq.config';

// Modules
import { MappingModule } from './mapping/mapping.module';

// Services
import { HederaService } from './services/hedera.service';
import { IpfsService } from './services/ipfs.service';
import { PolicySchemaImportService } from './services/policy-schema-import.service';
import { ProjectMapperService } from './services/project-mapper.service';

// Processors
import { TopicSyncProcessor } from './processors/topic-sync.processor';
import { MessageProcessProcessor } from './processors/message-process.processor';
import { TokenSyncProcessor } from './processors/token-sync.processor';
import { IpfsFetchProcessor } from './processors/ipfs-fetch.processor';
import { PolicyDecodeProcessor } from './processors/policy-decode.processor';
import { MvRefreshProcessor } from './processors/mv-refresh.processor';
import { BusinessViewBuilderProcessor } from './processors/business-view-builder.processor';
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
    [QUEUE_NAMES.MESSAGE_PARSE]: MessageProcessProcessor,
    [QUEUE_NAMES.TOKEN_SYNC]: TokenSyncProcessor,
    [QUEUE_NAMES.IPFS_FETCH]: IpfsFetchProcessor,
    [QUEUE_NAMES.POLICY_DECODE]: PolicyDecodeProcessor,
    [QUEUE_NAMES.MV_REFRESH]: MvRefreshProcessor,
    [QUEUE_NAMES.BUSINESS_VIEW_BUILD]: BusinessViewBuilderProcessor,
    [QUEUE_NAMES.PROJECT_REPARSE]: ProjectReparseProcessor,
};

@Module({})
export class WorkerModule {
    static register(): DynamicModule {
        const activeQueues = getActiveQueues();
        const allQueueNames = Object.values(QUEUE_NAMES);

        // Only register processors for queues this instance handles
        const activeProcessors = activeQueues
            .map(q => PROCESSOR_MAP[q])
            .filter(Boolean);

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

                // Register ALL queues (so processors can enqueue to any queue)
                BullModule.registerQueue(
                    ...allQueueNames.map(name => ({ name })),
                ),

                // Mapping pipeline module
                MappingModule,
            ],
            providers: [
                // Redict pub/sub client for event publishing
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

                // Services (always available for processors)
                HederaService,
                IpfsService,
                PolicySchemaImportService,
                ProjectMapperService,

                // Only processors for active queues
                ...activeProcessors,

                // Scheduler (only on instances that process data queues)
                ...(activeQueues.some(q => q.startsWith('mirror-node'))
                    ? [SyncSchedulerService]
                    : []),

                // Autoscaler — always registered; uses @Optional() for processor
                // injections so it gracefully handles partial processor sets.
                QueueAutoscalerService,
            ],
        };
    }
}
