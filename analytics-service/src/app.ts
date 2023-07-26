import {
    COMMON_CONNECTION_CONFIG,
    DataBaseHelper,
    LargePayloadContainer,
    Logger,
    MessageBrokerChannel,
    Workers
} from '@guardian/common';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { CronJob } from 'cron';
import express from 'express';
import process from 'process';
import { ReportService } from './analytics/report.service';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfig } from '@helpers/swagger-config';

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

        await ReportService.init(process.env.INITIALIZATION_TOPIC_ID);
        await ReportService.restart(process.env.INITIALIZATION_TOPIC_ID);

        const mask: string = process.env.ANALYTICS_SCHEDULER || '0 0 * * 1';
        const job = new CronJob(mask, () => {
            ReportService.run(process.env.INITIALIZATION_TOPIC_ID)
        }, null, false, 'UTC');
        job.start();

        const document = SwaggerModule.createDocument(app, SwaggerConfig);
        SwaggerModule.setup('api-docs', app, document);

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
