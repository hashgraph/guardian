import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ApiService } from './api/channel.service.js';
import { COMMON_CONNECTION_CONFIG, Migration, Utils, DataBaseHelper, entities } from '@indexer/common';

@Module({
    providers: [
        ApiService
    ]
})
class AppModule { }

const channelName = (process.env.SERVICE_CHANNEL || `indexer-service.${Utils.GenerateUUIDv4(26)}`).toUpperCase();

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
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
