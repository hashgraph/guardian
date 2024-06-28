import { ApplicationState, COMMON_CONNECTION_CONFIG, DataBaseHelper, Logger, MessageBrokerChannel, NotificationService } from '@guardian/common';
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
]).then(async values => {
    const [db, cn, app] = values;
    DataBaseHelper.orm = db;

    app.listen();
    const channel = new MessageBrokerChannel(cn, 'worker');
    const logger = new Logger();
    logger.setConnection(cn);
    const state = new ApplicationState();
    await state.setServiceName('QUEUE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    await new QueueService().setConnection(cn).init();

    await state.updateState(ApplicationStates.READY);
    logger.info('Queue service started', ['QUEUE_SERVICE'])

}, (reason) => {
    console.log(reason);
    process.exit(0);
})
