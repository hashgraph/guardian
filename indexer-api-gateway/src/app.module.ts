import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import process from 'process';
import express from 'express';

import { StatusApi } from './api/services/status.js';
import { LogsApi } from './api/services/logs.js';
import { ElasticApi } from './api/services/elastic.js';

const JSON_REQUEST_LIMIT = process.env.JSON_REQUEST_LIMIT || '1mb';

@Module({
    imports: [
        ClientsModule.register([{
            name: 'INDEXER_API',
            transport: Transport.NATS,
            options: {
                name: `${process.env.SERVICE_CHANNEL}`,
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ]
            }
        }])
    ],
    controllers: [
        StatusApi,
        LogsApi,
        ElasticApi
    ],
    providers: [
        // LoggerService,
    ]
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(express.json({
            limit: JSON_REQUEST_LIMIT
        })).forRoutes('*');
    }
}
