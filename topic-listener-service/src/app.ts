import {
    ApplicationState,
    COMMON_CONNECTION_CONFIG,
    DatabaseServer,
    GenerateTLSOptionsNats,
    LargePayloadContainer,
    MessageBrokerChannel,
    Migration,
    mongoForLoggingInitialization,
    PinoLogger,
    pinoLoggerInitialization,
    ValidateConfiguration
} from '@guardian/common';
import { ListenerService } from './api/listener-service.js';
import { ApplicationStates, GenerateUUIDv4 } from '@guardian/interfaces';
import * as process from 'process';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { DEFAULT_MONGO } from '#constants';
import { AppModule } from './app.module.js';

const channelName = (process.env.SERVICE_CHANNEL || `topic-listener.${GenerateUUIDv4().substring(26)}`).toUpperCase();

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false,
        },
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MONGO.MIN_POOL_SIZE, 10),
            maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MONGO.MAX_POOL_SIZE, 10),
            maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MONGO.MAX_IDLE_TIME_MS, 10)
        },
        ensureIndexes: true,
    }),
    MessageBrokerChannel.connect('LISTENER_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            name: channelName,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ],
            tls: GenerateTLSOptionsNats()
        },
    }),
    mongoForLoggingInitialization()
]).then(async ([_, db, mqConnection, app, loggerMongo]) => {
    app.listen();

    DatabaseServer.connectBD(db);

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

    const state = new ApplicationState();
    await state
        .setServiceName('LISTENER')
        .setConnection(mqConnection)
        .init();
    await state.updateState(ApplicationStates.STARTED);

    const validator = new ValidateConfiguration();

    let timer = null;
    validator.setValidator(async () => {
        if (timer) {
            clearInterval(timer);
        }

        // await state.updateState(ApplicationStates.INITIALIZING);
        // const w = new ListenerService(channelName, logger);
        // await w.setConnection(mqConnection).init();

        return true;
    });

    validator.setValidAction(async () => {
        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        await state.updateState(ApplicationStates.READY);
        logger.info('Listener started', [channelName, 'LISTENER']);
    });

    validator.setInvalidAction(async () => {
        timer = setInterval(async () => {
            await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        }, 1000);
        logger.error('Listener not configured', [channelName, 'LISTENER']);
    })

    await validator.validate();




    //Test
    const test = new ListenerService(channelName, logger);
    test.setConnection(mqConnection);
    await test.addListener({
        topicId: '0.0.5527121',
        name: 'test'
    });
    await test.init();


}, (reason) => {
    console.log(reason);
    process.exit(0);
})
