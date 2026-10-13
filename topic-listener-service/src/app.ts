import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { ApplicationState } from '@guardian/common/helpers/application-state';
import { COMMON_CONNECTION_CONFIG } from '@guardian/common/helpers/db-helper';
import { Environment } from '@guardian/common/helpers/environment';
import { GenerateTLSOptionsNats } from '@guardian/common/helpers/generate-tls-options';
import { Migration } from '@guardian/common/helpers/migration';
import { mongoForLoggingInitialization } from '@guardian/common/helpers/mongo-logging-initialization';
import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { pinoLoggerInitialization } from '@guardian/common/helpers/pino-logger-initialization';
import { ValidateConfiguration } from '@guardian/common/helpers/validate-configuration';
import { LargePayloadContainer } from '@guardian/common/mq/large-payload-container';
import { MessageBrokerChannel } from '@guardian/common/mq/message-broker-channel';
import { OldSecretManager } from '@guardian/common/secret-manager/old-style/old-secret-manager';
import { JwtServicesValidator } from '@guardian/common/security/jwt-services-validator';
import { ListenerService } from './api/listener-service.js';
import { ApplicationStates, GenerateUUIDv4 } from '@guardian/interfaces';
import * as process from 'node:process';
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
    const jwtServiceName = 'TOPIC_LISTENER_SERVICE';

    JwtServicesValidator.setServiceName(jwtServiceName);

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
