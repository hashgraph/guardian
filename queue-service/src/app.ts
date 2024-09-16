import { ApplicationState, COMMON_CONNECTION_CONFIG, DatabaseServer, MessageBrokerChannel, mongoForLoggingInitialization, NotificationService, PinoLogger, pinoLoggerInitialization } from '@guardian/common';
import { ApplicationStates, GenerateUUIDv4 } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { QueueService } from './queue-service/queue-service';

@Module({
    providers: [
        NotificationService,
    ]
})
class AppModule{
}

const channelName = (process.env.SERVICE_CHANNEL || `queue.${GenerateUUIDv4().substring(26)}`).toUpperCase();

Promise.all([
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true
    }),
    MessageBrokerChannel.connect('QUEUE_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            name: channelName,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ]
        },
    }),
    mongoForLoggingInitialization()
]).then(async values => {
    const [db, cn, app, loggerMongo] = values;

    DatabaseServer.connectBD(db);

    app.listen();
    // new MessageBrokerChannel(cn, 'worker');

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

    const state = new ApplicationState();
    await state.setServiceName('QUEUE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    await new QueueService().setConnection(cn).init();

    await state.updateState(ApplicationStates.READY);
    await logger.info('Queue service started', ['QUEUE_SERVICE'])

}, (reason) => {
    console.log(reason);
    process.exit(0);
})
