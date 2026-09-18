import {
    LargePayloadContainer,
    MessageError,
    MessageResponse,
    Log,
    DatabaseServer,
    MAP_ATTRIBUTES_AGGREGATION_FILTERS,
    JwtServiceAuthGuard,
} from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Ctx, MessagePattern, NatsContext, Payload, Transport } from '@nestjs/microservices';
import process from 'node:process';
import { FilterObject } from '@mikro-orm/core';
import { APP_GUARD } from '@nestjs/core';

@Controller()
export class LoggerService {
    /**
     * Add log message
     *
     * @param data
     * @param context
     */
    @MessagePattern(MessageAPI.WRITE_LOG, Transport.NATS)
    async writeLog(@Payload() message: any, @Ctx() context: NatsContext) {
        const logRepository = new DatabaseServer();
        try {
            if (!message) {
                throw new Error('Log message is empty');
            }

            await logRepository.save(Log, message);

            // if (message.type === LogType.ERROR) {
            //     channel.publish(ExternalMessageEvents.ERROR_LOG, message);
            // }
            return new MessageResponse(true);
        }
        catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(MessageAPI.GET_LOGS, Transport.NATS)
    async getLogs(@Payload() msg: any, @Ctx() context: NatsContext) {
        try {
            const logRepository = new DatabaseServer();

            const filters = msg && msg.filters || {};

            const pageParameters = msg && msg.pageParameters || {};

            const logs = await logRepository.find(Log, filters, {
                orderBy: {
                    datetime: msg.sortDirection && msg.sortDirection.toUpperCase() || 'DESC'
                },
                ...pageParameters
            });

            const totalCount = await logRepository.count(Log, filters as any);
            const directLink = new LargePayloadContainer().addObject(Buffer.from(JSON.stringify(logs)));
            return new MessageResponse({
                directLink,
                totalCount
            });
        }
        catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(MessageAPI.GET_ATTRIBUTES, Transport.NATS)
    async getAttributes(@Payload() msg: any, @Ctx() context: NatsContext) {
        const logRepository = new DatabaseServer();

        try {
            const nameFilter = `.*${msg.name || ''}.*`;
            const existingAttributes = msg.existingAttributes || [];
            const filters = msg.filters;

            const pipeline = logRepository.getAttributesAggregationFilters(
                MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT,
                nameFilter,
                existingAttributes
            ) as FilterObject<any>[];

            pipeline.unshift({
                $match: filters
            });

            const aggregateAttrResult = await logRepository.aggregate(Log, pipeline);

            return new MessageResponse(aggregateAttrResult[0].uniqueValues?.sort() || []);
        }
        catch (error) {
            return new MessageError<string>(error.toString());
        }
    }
}

// class LogClientSerializer implements Serializer {
//     serialize(value: any, options?: Record<string, any>): any {
//         console.log('s', value, options);
//
//         value.data = JSON.stringify(value.data)
//
//         return value;
//     }
// }
//
// class LogClientDeserializer implements Deserializer {
//     deserialize(value: any, options?: Record<string, any>): any {
//         console.log('d', value, options);
//         return value;
//     }
// }

/**
 * Logger module
 */
@Module({
    imports: [
        ClientsModule.register([{
            name: 'LOGGER',
            transport: Transport.NATS,
            options: {
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ],
                queue: 'logger-service',
                // serializer: new LogClientSerializer(),
                // deserializer: new LogClientDeserializer(),
            }
        }]),
    ],
    controllers: [
        LoggerService
    ],
    providers: [
        {
          provide: APP_GUARD,
          useFactory: () => new JwtServiceAuthGuard(Object.values(MessageAPI)),
        },
      ],
})
export class LoggerModule {}
