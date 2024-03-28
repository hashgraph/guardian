import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AnalyticsApi } from './api/service/analytics.js';
import process from 'process';
import express from 'express';

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
        AnalyticsApi
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
