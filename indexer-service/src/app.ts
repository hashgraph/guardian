import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
    ClientsModule,
    MicroserviceOptions,
    Transport,
} from '@nestjs/microservices';
import {
    COMMON_CONNECTION_CONFIG,
    Migration,
    Utils,
    DataBaseHelper,
    entities,
} from '@indexer/common';
import { ChannelService } from './api/channel.service.js';
import { LogService } from './_dev/api/log.service.js';
import { ElasticService } from './_dev/api/elastic.service.js';
import { SearchService } from './api/search.service.js';
import { EntityService } from './api/entities.service.js';
import { FiltersService } from './api/filters.service.js';
import { LandingService } from './api/landing.service.js';
import { SynchronizationTask } from './helpers/synchronization-task.js';
import {
    syncAnalytics,
    sychronizeSchemas,
    sychronizeVCs,
    sychronizePolicies,
    syncDidDocuments,
    sychronizeVPs,
    syncModules,
    syncRegistries,
    syncRoles,
    syncTools,
    syncTopics,
} from './helpers/synchronizers/index.js';

const channelName = (
    process.env.SERVICE_CHANNEL || `indexer-service.${Utils.GenerateUUIDv4(26)}`
).toUpperCase();

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'INDEXER_API',
                transport: Transport.NATS,
                options: {
                    name: channelName,
                    servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
                },
            },
        ]),
    ],
    controllers: [
        ChannelService,
        LogService,
        ElasticService,
        SearchService,
        EntityService,
        FiltersService,
        LandingService,
    ],
})
class AppModule {}

console.log(COMMON_CONNECTION_CONFIG);

Promise.all([
    Migration(
        {
            ...COMMON_CONNECTION_CONFIG,
            migrations: {
                path: 'dist/migrations',
                transactional: false,
            },
            driverOptions: {
                useUnifiedTopology: true,
            },
            ensureIndexes: true,
            entities,
        },
        []
    ),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            name: channelName,
            queue: 'INDEXER_SERVICES',
            servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
        },
    }),
]).then(
    async (values) => {
        const [db, app] = values;

        /**
         * DataBase
         */
        DataBaseHelper.connect(db);
        /**
         * Indexes
         */
        const em = await DataBaseHelper.getEntityManager();
        const collection = await em.getCollection('message');
        const textSearchIndex = await collection.indexExists('text_search');
        if (!textSearchIndex) {
            await collection.createIndex(
                {
                    'analytics.textSearch': 'text',
                },
                {
                    name: 'text_search',
                    sparse: true,
                }
            );
        }
        const instanceTopicIdIndex = await collection.indexExists(
            'instance_topic_id'
        );
        if (!instanceTopicIdIndex) {
            await collection.createIndex(
                {
                    'options.instanceTopicId': 1,
                },
                {
                    name: 'instance_topic_id',
                    sparse: true,
                }
            );
        }
        const childIdIndex = await collection.indexExists('child_id');
        if (!childIdIndex) {
            await collection.createIndex(
                {
                    'options.childId': 1,
                },
                {
                    name: 'child_id',
                    sparse: true,
                }
            );
        }
        /**
         * Listen
         */
        app.listen();
        /**
         * Sync tasks
         */
        const analytics = new SynchronizationTask(
            'analytics',
            syncAnalytics,
            process.env.SYNC_ANALYTICS_MASK || '0 * * * *'
        );
        analytics.start(
            process.env.START_SYNC_ANALYTICS?.toLowerCase() === 'true'
        );
        const modulesSync = new SynchronizationTask(
            'modules',
            syncModules,
            process.env.SYNC_MODULES_MASK || '0 * * * *'
        );
        modulesSync.start(
            process.env.START_SYNC_MODULES?.toLowerCase() === 'true'
        );
        const registriesSync = new SynchronizationTask(
            'registries',
            syncRegistries,
            process.env.SYNC_REGISTRIES_MASK || '0 * * * *'
        );
        registriesSync.start(
            process.env.START_SYNC_REGISTRIES?.toLowerCase() === 'true'
        );
        const rolesSync = new SynchronizationTask(
            'roles',
            syncRoles,
            process.env.SYNC_ROLES_MASK || '0 * * * *'
        );
        rolesSync.start(process.env.START_SYNC_ROLES?.toLowerCase() === 'true');
        const toolsSync = new SynchronizationTask(
            'tools',
            syncTools,
            process.env.SYNC_TOOLS_MASK || '0 * * * *'
        );
        toolsSync.start(process.env.START_SYNC_TOOLS?.toLowerCase() === 'true');
        const topicsSync = new SynchronizationTask(
            'topics',
            syncTopics,
            process.env.SYNC_TOPICS_MASK || '0 * * * *'
        );
        topicsSync.start(
            process.env.START_SYNC_TOPICS?.toLowerCase() === 'true'
        );
        const schemasSync = new SynchronizationTask(
            'schemas',
            sychronizeSchemas,
            process.env.SYNC_SCHEMAS_MASK || '0 * * * *'
        );
        schemasSync.start(
            process.env.START_SYNC_SCHEMAS?.toLowerCase() === 'true'
        );
        const didDocumentsSync = new SynchronizationTask(
            'dids',
            syncDidDocuments,
            process.env.SYNC_DID_DOCUMENTS_MASK || '0 * * * *'
        );
        didDocumentsSync.start(
            process.env.START_SYNC_DID_DOCUMENTS?.toLowerCase() === 'true'
        );
        const vcDocumentsSync = new SynchronizationTask(
            'vcs',
            sychronizeVCs,
            process.env.SYNC_VC_DOCUMENTS_MASK || '0 * * * *'
        );
        vcDocumentsSync.start(
            process.env.START_SYNC_VC_DOCUMENTS?.toLowerCase() === 'true'
        );
        const vpDocumentsSync = new SynchronizationTask(
            'vps',
            sychronizeVPs,
            process.env.SYNC_VC_DOCUMENTS_MASK || '0 * * * *'
        );
        vpDocumentsSync.start(
            process.env.START_SYNC_VP_DOCUMENTS?.toLowerCase() === 'true'
        );
        const policy = new SynchronizationTask(
            'policy',
            sychronizePolicies,
            process.env.SYNC_POLICIES_MASK || '0 * * * *'
        );
        policy.start(process.env.START_SYNC_POLICIES?.toLowerCase() === 'true');
    },
    (reason) => {
        console.log(reason);
        process.exit(0);
    }
);
