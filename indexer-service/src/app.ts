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
import { SearchService } from './api/search.service.js';
import { EntityService } from './api/entities.service.js';
import { FiltersService } from './api/filters.service.js';
import { LandingService } from './api/landing.service.js';
import { AnalyticsService } from './api/analytics.service.js';
import {
    SynchronizationSchemas,
    SynchronizationVCs,
    SynchronizationVPs,
    SynchronizationPolicy,
    SynchronizationTopics,
    SynchronizationTools,
    SynchronizationDid,
    SynchronizationRoles,
    SynchronizationRegistries,
    SynchronizationModules,
    SynchronizationContracts,
    SynchronizationAnalytics,
    SynchronizationProjects,
} from './helpers/synchronizers/index.js';
import { fixtures } from './helpers/fixtures.js';

const channelName = (
    process.env.SERVICE_CHANNEL || `indexer-service.${Utils.GenerateUUIDv4(26)}`
).toUpperCase();

async function updateIndexes() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
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
    const instanceTopicIdIndex = await collection.indexExists('instance_topic_id');
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
}

function getMask(mask: string | undefined): string {
    return (mask || '0 * * * *');
}

function getBoolean(flag: string | undefined): boolean {
    return (flag?.toLowerCase() === 'true');
}

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
        SearchService,
        EntityService,
        FiltersService,
        LandingService,
        AnalyticsService
    ],
})
class AppModule { }

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
        await updateIndexes();
        /**
         * Fixtures
         */
        fixtures();
        /**
         * Listen
         */
        app.listen();
        /**
         * Sync tasks
         */
        (new SynchronizationAnalytics(getMask(process.env.SYNC_ANALYTICS_MASK)))
            .start(getBoolean(process.env.START_SYNC_ANALYTICS));
        (new SynchronizationProjects(getMask(process.env.SYNC_ANALYTICS_MASK)))
            .start(getBoolean(process.env.START_SYNC_ANALYTICS));

        (new SynchronizationModules(getMask(process.env.SYNC_MODULES_MASK)))
            .start(getBoolean(process.env.START_SYNC_MODULES));

        (new SynchronizationRegistries(getMask(process.env.SYNC_REGISTRIES_MASK)))
            .start(getBoolean(process.env.START_SYNC_REGISTRIES));

        (new SynchronizationRoles(getMask(process.env.SYNC_ROLES_MASK)))
            .start(getBoolean(process.env.START_SYNC_ROLES));

        (new SynchronizationTools(getMask(process.env.SYNC_TOOLS_MASK)))
            .start(getBoolean(process.env.START_SYNC_TOOLS));

        (new SynchronizationTopics(getMask(process.env.SYNC_TOPICS_MASK)))
            .start(getBoolean(process.env.START_SYNC_TOPICS));

        (new SynchronizationSchemas(getMask(process.env.SYNC_SCHEMAS_MASK)))
            .start(getBoolean(process.env.START_SYNC_SCHEMAS));

        (new SynchronizationDid(getMask(process.env.SYNC_DID_DOCUMENTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_DID_DOCUMENTS));

        (new SynchronizationVCs(getMask(process.env.SYNC_VC_DOCUMENTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_VC_DOCUMENTS));

        (new SynchronizationVPs(getMask(process.env.SYNC_VP_DOCUMENTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_VP_DOCUMENTS));

        (new SynchronizationPolicy(getMask(process.env.SYNC_POLICIES_MASK)))
            .start(getBoolean(process.env.START_SYNC_POLICIES));

        (new SynchronizationContracts(getMask(process.env.SYNC_CONTRACTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_CONTRACTS));
    },
    (reason) => {
        console.log(reason);
        process.exit(0);
    }
);
