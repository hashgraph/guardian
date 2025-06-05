import { ApplicationState, COMMON_CONNECTION_CONFIG, DatabaseServer, GenerateTLSOptionsNats, JwtServicesValidator, LargePayloadContainer, MessageBrokerChannel, mongoForLoggingInitialization, NotificationService, OldSecretManager, PinoLogger, pinoLoggerInitialization, SecretManager } from '@guardian/common';
import { ApplicationStates, GenerateUUIDv4 } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { QueueService } from './queue-service/queue-service.js';

@Module({
    providers: [
        NotificationService,
    ]
})
class AppModule {
}

const channelName = (process.env.SERVICE_CHANNEL || `queue.${GenerateUUIDv4().substring(26)}`).toUpperCase();

Promise.all([
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        ensureIndexes: true
    }),
    MessageBrokerChannel.connect('QUEUE_SERVICE'),
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
]).then(async values => {
    const [db, cn, app, loggerMongo] = values;
    await new OldSecretManager().setConnection(cn).init();
    const secretManager = SecretManager.New();
    const jwtServiceName = 'QUEUE_SERVICE';

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
    // new MessageBrokerChannel(cn, 'worker');

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

    const state = new ApplicationState();
    await state.setServiceName('QUEUE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    await new QueueService().setConnection(cn).init();
    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }

    await state.updateState(ApplicationStates.READY);
    await logger.info('Queue service started', ['QUEUE_SERVICE'], null)

}, (reason) => {
    console.log(reason);
    process.exit(0);
})
