import {
    ApplicationState,
    COMMON_CONNECTION_CONFIG,
    DatabaseServer,
    Environment,
    GenerateTLSOptionsNats,
    JwtServicesValidator,
    LargePayloadContainer,
    MessageBrokerChannel,
    Migration,
    mongoForLoggingInitialization,
    OldSecretManager,
    PinoLogger,
    pinoLoggerInitialization,
    SecretManager,
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

    await new OldSecretManager().setConnection(mqConnection).init();
    const secretManager = SecretManager.New();
    const jwtServiceName = 'TOPIC_LISTENER_SERVICE';

    JwtServicesValidator.setSecretManager(secretManager)
    JwtServicesValidator.setServiceName(jwtServiceName)

    let { SERVICE_JWT_PUBLIC_KEY } = await secretManager.getSecrets(`publickey/jwt-service/${jwtServiceName}`);
    if (!SERVICE_JWT_PUBLIC_KEY) {
        SERVICE_JWT_PUBLIC_KEY = process.env.SERVICE_JWT_PUBLIC_KEY;
        if (SERVICE_JWT_PUBLIC_KEY?.length < 8) {
            throw new Error(`${jwtServiceName} service jwt keys not configured`);
        }
        await secretManager.setSecrets(`publickey/jwt-service/${jwtServiceName}`, {SERVICE_JWT_PUBLIC_KEY});
    }

    let { SERVICE_JWT_SECRET_KEY } = await secretManager.getSecrets(`secretkey/jwt-service/${jwtServiceName}`);

    if (!SERVICE_JWT_SECRET_KEY) {
        SERVICE_JWT_SECRET_KEY = process.env.SERVICE_JWT_SECRET_KEY;
        if (SERVICE_JWT_SECRET_KEY?.length < 8) {
            throw new Error(`${jwtServiceName} service jwt keys not configured`);
        }
        await secretManager.setSecrets(`secretkey/jwt-service/${jwtServiceName}`, {SERVICE_JWT_SECRET_KEY});
    }

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);

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
        await state.updateState(ApplicationStates.INITIALIZING);
        const listenerService = new ListenerService(channelName, logger);
        await listenerService.setConnection(mqConnection).init();
        return true;
    });

    validator.setValidAction(async () => {
        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        await state.updateState(ApplicationStates.READY);
        logger.info('Listener started', [channelName, 'LISTENER'], null);
    });

    validator.setInvalidAction(async () => {
        timer = setInterval(async () => {
            await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        }, 1000);
        logger.error('Listener not configured', [channelName, 'LISTENER'], null);
    })

    await validator.validate();
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
