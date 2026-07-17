import { ApplicationState, COMMON_CONNECTION_CONFIG, DatabaseServer, GenerateTLSOptionsNats, JwtServicesValidator, LargePayloadContainer, Log, MessageBrokerChannel, Migration, mongoForLoggingInitialization } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { NestFactory } from '@nestjs/core';
import { Deserializer, IncomingRequest, MicroserviceOptions, Serializer, Transport } from '@nestjs/microservices';
import process from 'node:process';
import { AppModule } from './app.module.js';

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
        },
        entities: [Log],
    }),
    mongoForLoggingInitialization(),
    MessageBrokerChannel.connect('LOGGER_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
        transport: Transport.NATS,
        options: {
            queue: 'logger-service',
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ],
            tls: GenerateTLSOptionsNats()
            // serializer: new LoggerSerializer(),
            // deserializer: new LoggerDeserializer(),
        },
    }),
]).then(async values => {
    const [_, db, mqConnection, app] = values;

    DatabaseServer.connectBD(db);

    app.listen();

    const jwtServiceName = 'LOGGER_SERVICE';

    JwtServicesValidator.setServiceName(jwtServiceName);

    const state = new ApplicationState();
    await state.setServiceName('LOGGER_SERVICE').setConnection(mqConnection).init();
    state.updateState(ApplicationStates.STARTED);

    state.updateState(ApplicationStates.INITIALIZING);
    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }

    const isMongoTransport = process.env.TRANSPORTS.includes('MONGO')

    if(isMongoTransport) {
        await state.updateState(ApplicationStates.READY);
    } else {
        await state.updateState(ApplicationStates.STOPPED);
    }

    // const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    // if (Number.isInteger(maxPayload)) {
    //     new LargePayloadContainer().runServer();
    // }
    console.log('logger service started', await state.getState());
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
