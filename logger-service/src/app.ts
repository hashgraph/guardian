import { ApplicationState, COMMON_CONNECTION_CONFIG, DataBaseHelper, LargePayloadContainer, MessageBrokerChannel, Migration } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { NestFactory } from '@nestjs/core';
import { Deserializer, IncomingRequest, MicroserviceOptions, Serializer, Transport } from '@nestjs/microservices';
import process from 'process';
import { AppModule } from './app.module';

export class LoggerSerializer implements Serializer {
    serialize(value: any, options?: Record<string, any>): any {
        value.data = Buffer.from(JSON.stringify(value), 'utf-8')
        return value
    }
}

export class LoggerDeserializer implements Deserializer {
    deserialize(value: any, options?: Record<string, any>): IncomingRequest {
        return JSON.parse(value.toString())
    }
}

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        }
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true
    }),
    MessageBrokerChannel.connect('LOGGER_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
        transport: Transport.NATS,
        options: {
            queue: 'logger-service',
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ],
            // serializer: new LoggerSerializer(),
            // deserializer: new LoggerDeserializer(),
        },
    }),
]).then(async values => {
    const [_, db, mqConnection, app] = values;
    DataBaseHelper.orm = db;

    app.listen();

    const state = new ApplicationState();
    await state.setServiceName('LOGGER_SERVICE').setConnection(mqConnection).init();
    state.updateState(ApplicationStates.STARTED);

    state.updateState(ApplicationStates.INITIALIZING);
    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }

    state.updateState(ApplicationStates.READY);
    // const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    // if (Number.isInteger(maxPayload)) {
    //     new LargePayloadContainer().runServer();
    // }
    console.log('logger service started', await state.getState());
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
