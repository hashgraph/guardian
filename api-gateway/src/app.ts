import { Guardians } from '@helpers/guardians';
import { IPFS } from '@helpers/ipfs';
import { PolicyEngine } from '@helpers/policy-engine';
import { WebSocketsService } from '@api/service/websockets';
import { Users } from '@helpers/users';
import { Wallet } from '@helpers/wallet';
import { LargePayloadContainer, Logger, MessageBrokerChannel } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import process from 'process';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfig } from '@helpers/swagger-config';
import { SwaggerModels, SwaggerPaths } from './old-descriptions';
import { MeecoAuth } from '@helpers/meeco';
import * as extraModels from './middlewares/validation/schemas'

const PORT = process.env.PORT || 3002;

// const restResponseTimeHistogram = new client.Histogram({
//     name: 'api_gateway_rest_response_time_duration_seconds',
//     help: 'api-gateway a histogram metric',
//     labelNames: ['method', 'route', 'statusCode'],
//     buckets: [0.1, 5, 15, 50, 100, 500],
// });

Promise.all([
    NestFactory.create(AppModule, {
        rawBody: true,
        bodyParser: false
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
        app.useGlobalPipes(new ValidationPipe({
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        }));

        app.use(json({ limit: '2mb' }));

        new Logger().setConnection(cn);
        await new Guardians().setConnection(cn).init();
        await new IPFS().setConnection(cn).init();
        await new PolicyEngine().setConnection(cn).init();
        await new Users().setConnection(cn).init();
        await new Wallet().setConnection(cn).init();

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
