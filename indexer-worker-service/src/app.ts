import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientsModule, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ChannelService, Worker } from './api/channel.service.js';
import { IPFSService } from './loaders/ipfs-service.js';
import { HederaService } from './loaders/hedera-service.js';
import { COMMON_CONNECTION_CONFIG, DataBaseHelper, entities, Environment, GenerateTLSOptionsNats, Migration, Utils } from '@indexer/common';

const channelName = (process.env.SERVICE_CHANNEL || `indexer-worker.${Utils.GenerateUUIDv4(26)}`).toUpperCase();

@Module({
    imports: [
        ClientsModule.register([{
            name: 'INDEXER_WORKERS_API',
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
        ChannelService
    ]
})
class AppModule { }

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        },
        ensureIndexes: true,
        entities
    }, []),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            name: channelName,
            queue: 'INDEXER_WORKERS',
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ],
            tls: GenerateTLSOptionsNats()
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

    if (Utils.isTopic(process.env.INITIALIZATION_TOPIC_ID)) {
        Environment.setRootTopicId(process.env.INITIALIZATION_TOPIC_ID);
    } else {
        // await new Logger().warn('INITIALIZATION_TOPIC_ID field in .env file: Incorrect topic id format', ['INDEXER_WORKER']);
        // await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        throw new Error('Worker not configured')
    }

    if (process.env.LOCALNODE_PROTOCOL && process.env.LOCALNODE_ADDRESS) {
        Environment.setLocalNodeAddress(process.env.LOCALNODE_PROTOCOL, process.env.LOCALNODE_ADDRESS);
    }

    try {
        Environment.setNetwork(process.env.HEDERA_NET);
    } catch (error) {
        // await new Logger().warn('Connection to the Header network is not configured', ['INDEXER_WORKER']);
        // await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        throw new Error('Worker not configured')
    }

    // await state.updateState(ApplicationStates.INITIALIZING);
    await IPFSService.init();
    await HederaService.init();

    const worker = new Worker();
    await worker.init({
        NAME: channelName,
        CYCLE_TIME: Utils.getIntParm(process.env.CYCLE_TIME, 60 * 60 * 1000),
        //MESSAGE
        MESSAGE_READ_DELAY: Utils.getIntParm(process.env.MESSAGE_READ_DELAY, 1000),
        MESSAGE_READ_TIMEOUT: Utils.getIntParm(process.env.MESSAGE_READ_TIMEOUT, 60 * 1000),
        MESSAGE_JOB_REFRESH_TIME: Utils.getIntParm(process.env.MESSAGE_JOB_REFRESH_TIME, 60 * 1000),
        MESSAGE_JOB_COUNT: Utils.getIntParm(process.env.MESSAGE_JOB_COUNT, 10),
        //TOPIC
        TOPIC_READ_DELAY: Utils.getIntParm(process.env.TOPIC_READ_DELAY, 1000),
        TOPIC_READ_TIMEOUT: Utils.getIntParm(process.env.TOPIC_READ_TIMEOUT, 60 * 1000),
        TOPIC_JOB_REFRESH_TIME: Utils.getIntParm(process.env.TOPIC_JOB_REFRESH_TIME, 60 * 1000),
        TOPIC_JOB_COUNT: Utils.getIntParm(process.env.TOPIC_JOB_COUNT, 5),
        //TOKEN
        TOKEN_READ_DELAY: Utils.getIntParm(process.env.TOKEN_READ_DELAY, 1000),
        TOKEN_READ_TIMEOUT: Utils.getIntParm(process.env.TOKEN_READ_TIMEOUT, 60 * 1000),
        TOKEN_JOB_REFRESH_TIME: Utils.getIntParm(process.env.TOKEN_JOB_REFRESH_TIME, 60 * 1000),
        TOKEN_JOB_COUNT: Utils.getIntParm(process.env.TOKEN_JOB_COUNT, 2),
        //FILE
        FILE_CYCLE_TIME: Utils.getIntParm(process.env.FILE_CYCLE_TIME, 24 * 60 * 60 * 1000),
        FILE_READ_DELAY: Utils.getIntParm(process.env.FILE_READ_DELAY, 5 * 1000),
        FILE_READ_TIMEOUT: Utils.getIntParm(process.env.FILE_READ_TIMEOUT, 60 * 1000),
        FILE_JOB_REFRESH_TIME: Utils.getIntParm(process.env.FILE_JOB_REFRESH_TIME, 60 * 1000),
        FILE_JOB_COUNT: Utils.getIntParm(process.env.FILE_JOB_COUNT, 2),
    }).start();

    // await state.updateState(ApplicationStates.READY);
    // await new Logger().info('Worker started', ['INDEXER_WORKER']);
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
