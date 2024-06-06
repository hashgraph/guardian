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
import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfig } from './helpers/swagger-config.js';
import { MeecoAuth } from './helpers/meeco.js';
import * as extraModels from './middlewares/index.js'
import { ProjectService } from './helpers/projects.js';
import { AISuggestions } from './helpers/ai-suggestions.js';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyFormbody from '@fastify/formbody'
import fastifyMultipart from '@fastify/multipart';

const PORT = process.env.PORT || 3002;

const BODY_LIMIT = 1024 * 1024 * 1024

Promise.all([
    NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ ignoreTrailingSlash: true }), {
        rawBody: true,
        bodyParser: false,
    }),
    MessageBrokerChannel.connect('API_GATEWAY'),
]).then(async ([app, cn]) => {
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
        app.enableVersioning({
            type: VersioningType.HEADER,
            header: 'Api-Version',
        });
        app.useGlobalPipes(new ValidationPipe({
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        }));

        await app.register(fastifyFormbody);
        await app.register(fastifyMultipart);

        app.useBodyParser('json', { bodyLimit: BODY_LIMIT });
        app.useBodyParser('binary/octet-stream', { bodyLimit: BODY_LIMIT });

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
        const wsService = new WebSocketsService();
        wsService.setConnection(server, cn).init();

        new TaskManager().setDependencies(wsService, cn);

        const document = SwaggerModule.createDocument(app, SwaggerConfig, {
            extraModels: Object.values(extraModels).filter((constructor: new (...args: any[]) => any) => {
                try {
                    // tslint:disable-next-line:no-unused-expression
                    new constructor();
                    return true
                } catch {
                    return false;
                }
            }) as any
        });
        // Object.assign(document.paths, SwaggerPaths)
        // Object.assign(document.components.schemas, SwaggerModels.schemas);
        SwaggerModule.setup('api-docs', app, document);

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        app.listen(PORT, '0.0.0.0', async () => {
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
