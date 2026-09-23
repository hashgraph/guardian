import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { ApplicationState } from '@guardian/common/helpers/application-state';
import { COMMON_CONNECTION_CONFIG } from '@guardian/common/helpers/db-helper';
import { GenerateTLSOptionsNats } from '@guardian/common/helpers/generate-tls-options';
import { Migration } from '@guardian/common/helpers/migration';
import { mongoForLoggingInitialization } from '@guardian/common/helpers/mongo-logging-initialization';
import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { pinoLoggerInitialization } from '@guardian/common/helpers/pino-logger-initialization';
import { LargePayloadContainer } from '@guardian/common/mq/large-payload-container';
import { MessageBrokerChannel } from '@guardian/common/mq/message-broker-channel';
import { JwtServicesValidator } from '@guardian/common/security/jwt-services-validator';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import process from 'node:process';
import { AppModule } from './app.module.js';
import { DEFAULT_MONGO } from '#constants';

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
    MessageBrokerChannel.connect('NOTIFICATION_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            queue: 'notification-service',
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
            tls: GenerateTLSOptionsNats()
        },
    }),
    mongoForLoggingInitialization()
]).then(
    async (values) => {
        const [_, db, mqConnection, app, loggerMongo] = values;
        const jwtServiceName = 'NOTIFICATION_SERVICE';

        JwtServicesValidator.setServiceName(jwtServiceName);

        DatabaseServer.connectBD(db);

        app.listen();

        const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

        const state = new ApplicationState();
        await state
            .setServiceName('NOTIFICATION_SERVICE')
            .setConnection(mqConnection)
            .init();
        state.updateState(ApplicationStates.STARTED);
        state.updateState(ApplicationStates.INITIALIZING);
        state.updateState(ApplicationStates.READY);

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }

        await logger.info('notification service started', ['NOTIFICATION_SERVICE'], null);
    },
    (reason) => {
        console.log(reason);
        process.exit(0);
    }
);
