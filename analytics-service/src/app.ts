import process from 'process';
import { COMMON_CONNECTION_CONFIG, LargePayloadContainer, Logger, MessageBrokerChannel, } from '@guardian/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import express from 'express';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { AppModule } from './app.module';

console.log(process.env)

const PORT = process.env.PORT || 3020;
Promise.all([
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true
    }),
    NestFactory.create(AppModule, {
        rawBody: true,
        bodyParser: false
    }),
    MessageBrokerChannel.connect('ANALYTICS_SERVICE'),
]).then(async ([db, app, cn]) => {
    try {
        app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.NATS,
            options: {
                name: `${process.env.SERVICE_CHANNEL}`,
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ]
            },
        });
        app.useGlobalPipes(new ValidationPipe({
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        }));

        app.use(express.static('public'));
        app.use(express.json({ limit: '2mb' }));

        new Logger().setConnection(cn);

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }

        app.listen(PORT, async () => {
            const url = await app.getUrl();
            console.log(`URL: ${url}`);
            new Logger().info(`Started on ${PORT}`, ['ANALYTICS_SERVICE']);
        });
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}, (reason) => {
    console.log(reason);
    process.exit(0);
});