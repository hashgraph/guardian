import { ApplicationState, COMMON_CONNECTION_CONFIG, DatabaseServer, OldSecretManager, SecretManager, GenerateTLSOptionsNats, LargePayloadContainer, MessageBrokerChannel, Migration, mongoForLoggingInitialization, PinoLogger, pinoLoggerInitialization, JwtServicesValidator } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import process from 'process';
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
        await new OldSecretManager().setConnection(mqConnection).init();
        const secretManager = SecretManager.New();
        const jwtServiceName = 'NOTIFICATION_SERVICE';

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
