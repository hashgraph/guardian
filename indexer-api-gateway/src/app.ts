import { AppModule } from './app.module.js';
import { NestFactory } from '@nestjs/core';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerConfig } from './helpers/swagger-config.js';
import { json } from 'express';
import process from 'node:process';
import { Utils } from '@indexer/common';

const PORT = process.env.PORT || 3021;
const channelName = (
    process.env.SERVICE_CHANNEL ||
    `indexer-api-gateway.${Utils.GenerateUUIDv4(26)}`
).toUpperCase();

Promise.all([
    NestFactory.create(AppModule, {
        rawBody: true,
        bodyParser: false,
    }),
]).then(
    async ([app]) => {
        try {
            const services = app.connectMicroservice<MicroserviceOptions>({
                transport: Transport.NATS,
                options: {
                    name: channelName,
                    queue: 'INDEXER_API_SERVICES',
                    servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
                },
                // tls: GenerateTLSOptionsNats()
            });
            app.useGlobalPipes(
                new ValidationPipe({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                })
            );

            app.use(json({ limit: '10mb' }));

            const document = SwaggerModule.createDocument(app, SwaggerConfig, {
                extraModels: [],
            });
            console.log(document.toString())
            SwaggerModule.setup('api-docs', app, document);

            services.listen();

            app.listen(PORT, async () => {
                // new Logger().info(`Started on ${PORT}`, ['API_GATEWAY']);
                console.log(`Started on ${PORT}`);
            });
        } catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    },
    (reason) => {
        console.log(reason);
        process.exit(0);
    }
);
