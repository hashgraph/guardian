import { ApplicationState, COMMON_CONNECTION_CONFIG, DatabaseServer, GenerateTLSOptionsNats, JwtServicesValidator, LargePayloadContainer, MessageBrokerChannel, mongoForLoggingInitialization, NotificationService, OldSecretManager, PinoLogger, pinoLoggerInitialization } from '@guardian/common';
import { ApplicationStates, GenerateUUIDv4 } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import * as process from 'node:process';
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
    const jwtServiceName = 'QUEUE_SERVICE';

    JwtServicesValidator.setServiceName(jwtServiceName);

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
