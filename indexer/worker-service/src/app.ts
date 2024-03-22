import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import * as ent from './entity/index.js';
import { COMMON_CONNECTION_CONFIG } from './db-helper/db-config.js';
import { Migration } from './db-helper/db-migration.js';
import { DataBaseHelper } from './db-helper/db-helper.js';

import { Utils } from './utils/utils.js';
import { Environment } from './utils/environment.js';
import { ChannelService, Worker } from './api/channel.service.js';
import { IPFSService } from './loaders/ipfs-service.js';
import { HederaService } from './loaders/hedera-service.js';

// import {
//     MessageBrokerChannel,
//     ValidateConfiguration,
//     ApplicationState,
//     Logger,
// } from '@guardian/common';
// import { ApplicationStates } from '@guardian/interfaces';
import { ValidateConfiguration } from '@guardian/common';

@Module({
    providers: [
        ChannelService
    ]
})
class AppModule { }

const channelName = (process.env.SERVICE_CHANNEL || `indexer-worker.${Utils.GenerateUUIDv4(26)}`).toUpperCase();

const entities = Object.values(ent);

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
            queue: 'INDEXER_WORKERS',
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

    let timer = null;
    const validator = new ValidateConfiguration();
    validator.setValidator(async () => {
        if (timer) {
            clearInterval(timer);
        }

        if (Utils.isTopic(process.env.INITIALIZATION_TOPIC_ID)) {
            Environment.setRootTopicId(process.env.INITIALIZATION_TOPIC_ID);
        } else {
            // await new Logger().warn('INITIALIZATION_TOPIC_ID field in .env file: Incorrect topic id format', ['INDEXER_WORKER']);
            return false;
        }

        if (process.env.LOCALNODE_PROTOCOL && process.env.LOCALNODE_ADDRESS) {
            Environment.setLocalNodeAddress(process.env.LOCALNODE_PROTOCOL, process.env.LOCALNODE_ADDRESS);
        }

        try {
            Environment.setNetwork(process.env.HEDERA_NET);
        } catch (error) {
            // await new Logger().warn('Connection to the Header network is not configured', ['INDEXER_WORKER']);
            return false;
        }

        // await state.updateState(ApplicationStates.INITIALIZING);
        await IPFSService.init();
        await HederaService.init();

        const worker = new Worker();
        await worker.init({
            CYCLE_TIME: 60 * 60 * 1000,
            TOPIC_READ_DELAY: 1000,
            TOPIC_READ_TIMEOUT: 60000,
            TOPIC_JOB_REFRESH_TIME: 60000,
            TOPIC_JOB_COUNT: 10,
            MESSAGE_READ_DELAY: 1000,
            MESSAGE_READ_TIMEOUT: 60000,
            MESSAGE_JOB_REFRESH_TIME: 60000,
            MESSAGE_JOB_COUNT: 10
        }).start();

        return true;
    });

    validator.setValidAction(async () => {
        // await state.updateState(ApplicationStates.READY);
        // await new Logger().info('Worker started', ['INDEXER_WORKER']);
    });

    validator.setInvalidAction(async () => {
        // timer = setInterval(async () => {
        //     await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        // }, 1000);
        // await new Logger().error('Worker not configured', ['INDEXER_WORKER']);
    })

    await validator.validate();
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
