import * as process from 'node:process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientsModule, MicroserviceOptions, Transport, } from '@nestjs/microservices';
import { COMMON_CONNECTION_CONFIG, DataBaseHelper, entities, Environment, GenerateTLSOptionsNats, Migration, Utils } from '@indexer/common';
import { ChannelService } from './api/channel.service.js';
import { LogService } from './_dev/api/log.service.js';
import { SearchService } from './api/search.service.js';
import { EntityService } from './api/entities.service.js';
import { FiltersService } from './api/filters.service.js';
import { LandingService } from './api/landing.service.js';
import { AnalyticsService } from './api/analytics.service.js';
import { SettingsService } from './api/settings.service.js';
import { LoadingQueueService } from './api/loading-queue.service.js';
import { SynchronizationAll } from './helpers/synchronizers/index.js';
import { fixtures } from './helpers/fixtures.js';
import { AnalyticsTask } from './helpers/analytics-task.js';
import {ArtifactsService} from './api/artifacts.service.js';

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
        AnalyticsService,
        SettingsService,
        LoadingQueueService,
        ArtifactsService
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
            tls: GenerateTLSOptionsNats()
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

        try {
            Environment.setNetwork(process.env.HEDERA_NET);
        } catch (error) {
            throw new Error('Worker not configured')
        }

        await LoadingQueueService.init();

        /**
         * Sync tasks
         */
        SynchronizationAll.createAllTasks();

        /**
         * Analytic task
         */
        await AnalyticsTask.create();
    },
    (reason) => {
        console.log(reason);
        process.exit(0);
    }
);
