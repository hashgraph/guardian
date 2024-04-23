import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientsModule, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { COMMON_CONNECTION_CONFIG, Migration, Utils, DataBaseHelper, entities } from '@indexer/common';
import { ChannelService } from './api/channel.service.js';
import { LogService } from './api/log.service.js';
import { ElasticService } from './api/elastic.service.js';
import { SearchService } from './api/search.service.js';

const channelName = (process.env.SERVICE_CHANNEL || `indexer-service.${Utils.GenerateUUIDv4(26)}`).toUpperCase();

@Module({
    imports: [
        ClientsModule.register([{
            name: 'INDEXER_API',
            transport: Transport.NATS,
            options: {
                name: channelName,
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ]
            }
        }])
    ],
    controllers: [
        ChannelService,
        LogService,
        ElasticService,
        SearchService
    ]
})
class AppModule { }

console.log(COMMON_CONNECTION_CONFIG)

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        },
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true,
        entities
    }, []),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            name: channelName,
            queue: 'INDEXER_SERVICES',
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ]
        },
    }),
]).then(async values => {
    const [db, app] = values;

    /**
     * DataBase
     */
    DataBaseHelper.connect(db);
    /**
     * Listen
     */
    app.listen();

    // const state = new ApplicationState();
    // await state.setServiceName('INDEXER_WORKER').setConnection(cn).init();
    // await state.updateState(ApplicationStates.STARTED);

    // await state.updateState(ApplicationStates.READY);
    // await new Logger().info('Worker started', ['INDEXER_WORKER']);

    // ElasticService.updateElastic().then();
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
