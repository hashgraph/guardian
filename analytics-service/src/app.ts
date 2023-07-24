import process from 'process';
import { COMMON_CONNECTION_CONFIG, DataBaseHelper, LargePayloadContainer, Logger, MessageBrokerChannel, Workers, } from '@guardian/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import express from 'express';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { AppModule } from './app.module';
import { ReportServiceService } from './analytics/report.service';

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
        DataBaseHelper.orm = db;
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
        const workersHelper = new Workers();
        await workersHelper.setConnection(cn).init();
        workersHelper.initListeners();

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }


        await ReportServiceService.init(process.env.INITIALIZATION_TOPIC_ID);
        await ReportServiceService.restart(process.env.INITIALIZATION_TOPIC_ID);
        // setTimeout(() => {
        //     ReportServiceService.update(process.env.INITIALIZATION_TOPIC_ID).then(() => {
        //         new Logger().info(`Update completed`, ['ANALYTICS_SERVICE']);
        //     }, (error) => {
        //         new Logger().error(`Update error: ${error?.message}`, ['ANALYTICS_SERVICE']);
        //     });
        // }, 1000000000000);

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
