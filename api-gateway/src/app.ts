// import client from 'prom-client';
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

const PORT = process.env.PORT || 3002;
// const RAW_REQUEST_LIMIT = process.env.RAW_REQUEST_LIMIT || '1gb';
// const JSON_REQUEST_LIMIT = process.env.JSON_REQUEST_LIMIT || '1mb';

// const restResponseTimeHistogram = new client.Histogram({
//     name: 'api_gateway_rest_response_time_duration_seconds',
//     help: 'api-gateway a histogram metric',
//     labelNames: ['method', 'route', 'statusCode'],
//     buckets: [0.1, 5, 15, 50, 100, 500],
// });

Promise.all([
    NestFactory.create(AppModule, {
        rawBody: true
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

        new Logger().setConnection(cn);
        await new Guardians().setConnection(cn).init();
        await new IPFS().setConnection(cn).init();
        await new PolicyEngine().setConnection(cn).init();
        await new Users().setConnection(cn).init();
        await new Wallet().setConnection(cn).init();

        const server = app.getHttpServer();
        const wsService = new WebSocketsService(server, cn);
        wsService.init();

        new TaskManager().setDependecies(wsService, cn);

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
