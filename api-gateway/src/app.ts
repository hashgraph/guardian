import hpp from 'hpp';
import client from 'prom-client';
import { Guardians } from '@helpers/guardians';
import express from 'express';
import { createServer } from 'http';
import { authorizationHelper } from '@auth/authorization-helper';
import { IPFS } from '@helpers/ipfs';
// import { policyAPI } from '@api/service/policy';
import { PolicyEngine } from '@helpers/policy-engine';
import { WebSocketsService } from '@api/service/websockets';
import { Users } from '@helpers/users';
import { Wallet } from '@helpers/wallet';
// import { settingsAPI } from '@api/service/settings';
// import { loggerAPI } from '@api/service/logger';
import { MessageBrokerChannel, Logger, LargePayloadContainer } from '@guardian/common';
// import { taskAPI } from '@api/service/task';
import { TaskManager } from '@helpers/task-manager';
// import { singleSchemaRoute } from '@api/service/schema';
// import { artifactAPI } from '@api/service/artifact';
import fileupload from 'express-fileupload';
// import { contractAPI } from '@api/service/contract';
// import { mapAPI } from '@api/service/map';
import { wizardAPI } from '@api/service/wizard';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

const PORT = process.env.PORT || 3002;
const RAW_REQUEST_LIMIT = process.env.RAW_REQUEST_LIMIT || '1gb';
const JSON_REQUEST_LIMIT = process.env.JSON_REQUEST_LIMIT || '1mb';

const restResponseTimeHistogram = new client.Histogram({
    name: 'api_gateway_rest_response_time_duration_seconds',
    help: 'api-gateway a histogram metric',
    labelNames: ['method', 'route', 'statusCode'],
    buckets: [0.1, 5, 15, 50, 100, 500],
});

Promise.all([
    NestFactory.create(AppModule),
    MessageBrokerChannel.connect('API_GATEWAY'),
]).then(async ([app, cn]) => {
    try {
        // const express1 = express();

        // express1.use(express.json({
        //     limit: JSON_REQUEST_LIMIT
        // }));
        // express1.use(express.raw({
        //     inflate: true,
        //     limit: RAW_REQUEST_LIMIT,
        //     type: 'binary/octet-stream'
        // }));
        // express1.use(fileupload());
        // express1.use(hpp());
        new Logger().setConnection(cn);
        await new Guardians().setConnection(cn).init();
        await new IPFS().setConnection(cn).init();
        await new PolicyEngine().setConnection(cn).init();
        await new Users().setConnection(cn).init();
        await new Wallet().setConnection(cn).init();

        // const server = createServer();
        const server = app.getHttpServer();
        const wsService = new WebSocketsService(server, cn);
        wsService.init();

        new TaskManager().setDependecies(wsService, cn);

        ////////////////////////////////////////

        // Config routes
        // express1.use('/policies', authorizationHelper, policyAPI);
        // app.use('/accounts', accountAPI);
        // express1.use('/profiles', authorizationHelper, profileAPI);
        // express1.use('/settings', authorizationHelper, settingsAPI);
        // express1.use('/schema', authorizationHelper, singleSchemaRoute);
        // express1.use('/schemas', authorizationHelper, schemaAPI);
        // express1.use('/tokens', authorizationHelper, tokenAPI);
        // express1.use('/artifacts', authorizationHelper, artifactAPI);
        // express1.use('/trust-chains/', authorizationHelper, trustChainsAPI);
        // express1.use('/external/', externalAPI);
        // express1.use('/demo/', demoAPI);
        // express1.use('/ipfs', authorizationHelper, ipfsAPI);
        // express1.use('/logs', authorizationHelper, loggerAPI);
        // express1.use('/tasks', taskAPI);
        // express1.use('/analytics', authorizationHelper, analyticsAPI);
        // express1.use('/contracts', authorizationHelper, contractAPI);
        // express1.use('/modules', authorizationHelper, moduleAPI);
        // express1.use('/tags', authorizationHelper, tagsAPI);
        // express1.use('/map', mapAPI);
        // express1.use('/themes', authorizationHelper, themesAPI);
        // express1.use('/metrics', metricsAPI);

        // express1.use('/wizard', authorizationHelper, wizardAPI);

        /**
         * @deprecated 2023-03-01
         */
        // express1.use('/trustchains/', authorizationHelper, trustchainsAPI);
        // express1.use('/artifact', authorizationHelper, artifactAPI);
        /////////////////////////////////////////
        // express1.use((req, res, next) => {
        //     const start = Date.now();
        //     res.on('finish', () => {
        //         const responseTime = Date.now() - start;
        //         restResponseTimeHistogram
        //           .observe(
        //             {
        //                 method: req.method,
        //                 route: req?.route?.path || '/',
        //                 statusCode: res.statusCode,
        //             },
        //             responseTime * 1000);
        //     });
        //     next();
        // });

        // middleware error handler
        // express1.use((err, req, res, next) => {
        //     return res.status(err?.status || 500).json({ code: err?.status || 500, message: err.message })
        // });

        // server.setTimeout();
        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        app.listen(PORT, async () => {
            console.log(await app.getUrl());
            new Logger().info(`Started on ${PORT}`, ['API_GATEWAY']);
        });
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
