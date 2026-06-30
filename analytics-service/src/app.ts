import {
    COMMON_CONNECTION_CONFIG,
    DatabaseServer,
    JwtServicesValidator,
    LargePayloadContainer,
    MessageBrokerChannel,
    Migration,
    mongoForLoggingInitialization,
    PinoLogger,
    pinoLoggerInitialization,
    Workers,
} from '@guardian/common';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { CronJob } from 'cron';
import express from 'express';
import process from 'node:process';
import { ReportService } from './analytics/report.service.js';
import { AppModule } from './app.module.js';
import { SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfig } from './helpers/swagger-config.js';
import { AnalyticsUtils } from './helpers/utils.js';

const PORT = process.env.PORT || 3020;
Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false,
        },
        ensureIndexes: true,
    }, [
        'v2-21-0',
    ]),
    NestFactory.create(AppModule, {
        rawBody: true,
        bodyParser: false,
    }),
    MessageBrokerChannel.connect('ANALYTICS_SERVICE'),
    mongoForLoggingInitialization(),
]).then(async ([db, app, cn, loggerMongo]) => {
    try {
        const jwtServiceName = 'ANALYTICS_SERVICE';

        JwtServicesValidator.setServiceName(jwtServiceName);

        DatabaseServer.connectBD(db);

        app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.NATS,
            options: {
                name: `${process.env.SERVICE_CHANNEL}`,
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`,
                ],
            },
        });
        app.useGlobalPipes(new ValidationPipe({
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }));

        const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

        app.use(express.static('public'));
        app.use(express.json({ limit: '2mb' }));

        AnalyticsUtils.DEBUG_LVL = parseInt(process.env.ANALYTICS_DEBUG_LVL || '3', 10);
        AnalyticsUtils.REQUEST_LIMIT = parseInt(process.env.ANALYTICS_REQUEST_LIMIT || '30', 10);

        const workersHelper = new Workers();
        await workersHelper.setConnection(cn).init();
        workersHelper.initListeners();

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }

        await ReportService.init(ReportService.getRootTopic(), ReportService.getRestartDate());
        await ReportService.restart(ReportService.getRootTopic(), ReportService.getRestartDate());

        const mask: string = process.env.ANALYTICS_SCHEDULER || '0 0 * * 1';
        const job = new CronJob(mask, () => {
            ReportService.run(ReportService.getRootTopic(), ReportService.getRestartDate());
        }, null, false, 'UTC');
        job.start();

        const document = SwaggerModule.createDocument(app, SwaggerConfig);
        SwaggerModule.setup('api-docs', app, document);

        app.listen(PORT, async () => {
            const url = await app.getUrl();
            console.log(`URL: ${url}`);
            logger.info(`Started on ${PORT}`, ['ANALYTICS_SERVICE'], null);
        });
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
