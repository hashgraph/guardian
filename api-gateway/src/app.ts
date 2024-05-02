import { Guardians } from './helpers/guardians.js';
import { IPFS } from './helpers/ipfs.js';
import { PolicyEngine } from './helpers/policy-engine.js';
import { WebSocketsService } from './api/service/websockets.js';
import { Users } from './helpers/users.js';
import { Wallet } from './helpers/wallet.js';
import { LargePayloadContainer, Logger, MessageBrokerChannel } from '@guardian/common';
import { TaskManager } from './helpers/task-manager.js';
import { AppModule } from './app.module.js';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import process from 'process';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import express, { json } from 'express';
import { SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfig } from './helpers/swagger-config.js';
import { SwaggerModels, SwaggerPaths } from './old-descriptions.js';
import { MeecoAuth } from './helpers/meeco.js';
import * as extraModels from './middlewares/validation/schemas/index.js'
import { ProjectService } from './helpers/projects.js';
import { AISuggestions } from './helpers/ai-suggestions.js';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastify from 'fastify';
import fastifyFormbody from '@fastify/formbody'
import fastifyMultipart from '@fastify/multipart';

const PORT = process.env.PORT || 3002;

// const restResponseTimeHistogram = new client.Histogram({
//     name: 'api_gateway_rest_response_time_duration_seconds',
//     help: 'api-gateway a histogram metric',
//     labelNames: ['method', 'route', 'statusCode'],
//     buckets: [0.1, 5, 15, 50, 100, 500],
// });

export const fastifyInstance = fastify({});

// fastifyInstance.addHook('onRoute', (opts) => {
//     opts.config = { rawBody: true };
// });

// fastifyInstance.addContentTypeParser(
//   ['multipart/form-data'],
//   { parseAs: 'string' },
//   fastifyInstance.getDefaultJsonParser('ignore', 'ignore'),
// );

// fastifyInstance.addContentTypeParser('multipart/form-data', async function (req) {
//   var res = await new Promise((resolve, reject) => resolve(req))
//   return res
// })

// export const rowBodyConfig = {
//   field: 'rawBody', // change the default request.rawBody property name
//   global: true, // add the rawBody to every request. *Default true*
//   encoding: 'utf8', // set it in false to set rawBody as a Buffer *Default utf8*
//   runFirst: true, // get the body before any preParsing hook change/uncompress it. *Default false*
// };

Promise.all([
    NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
        // bufferLogs: true,
        // logger: ['error', 'warn'],
        rawBody: true,
        bodyParser: false,
    }),
    MessageBrokerChannel.connect('API_GATEWAY'),
]).then(async ([app, cn]) => {
    try {
        // await app.register(rawBody, rowBodyConfig)

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

        await app.register(fastifyFormbody);
        await app.register(fastifyMultipart);

        const bodyLimit = 10_485_760;
        app.useBodyParser('json', { bodyLimit });
        app.useBodyParser('binary/octet-stream', { bodyLimit: 1024 * 1024 * 1024 });
        // app.useBodyParser('multipart/form-data', { bodyLimit: 1024 * 1024 * 1024 });
        // app.use(json({ limit: '10mb' }));


        new Logger().setConnection(cn);
        await new Guardians().setConnection(cn).init();
        await new IPFS().setConnection(cn).init();
        await new PolicyEngine().setConnection(cn).init();
        await new Users().setConnection(cn).init();
        await new Wallet().setConnection(cn).init();
        await new AISuggestions().setConnection(cn).init();
        await new ProjectService().setConnection(cn).init();

        await new MeecoAuth().setConnection(cn).init();
        await new MeecoAuth().registerListeners();

        const server = app.getHttpServer();
        const wsService = new WebSocketsService(server, cn);
        wsService.init();

        new TaskManager().setDependecies(wsService, cn);

        const document = SwaggerModule.createDocument(app, SwaggerConfig, {
            extraModels: Object.values(extraModels).filter((constructor: new (...args: any[]) => any) => {
                try {
                    // tslint:disable-next-line:no-unused-expression
                    new constructor();
                    return true
                } catch {
                    return false;
                }
            })
        });
        Object.assign(document.paths, SwaggerPaths)
        Object.assign(document.components.schemas, SwaggerModels.schemas);
        SwaggerModule.setup('api-docs', app, document);

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        app.listen(PORT, async () => {
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
