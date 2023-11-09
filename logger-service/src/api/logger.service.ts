import { Log } from '@entity/log';
import { DataBaseHelper, LargePayloadContainer, MessageError, MessageResponse } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Ctx, MessagePattern, NatsContext, Payload, Transport } from '@nestjs/microservices';
import process from 'process';

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
        const logRepository = new DataBaseHelper(Log);
        try {
            if (!message) {
                throw new Error('Log message is empty');
            }

            await logRepository.save(message);

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
            const logRepository = new DataBaseHelper(Log);

            const filters = msg && msg.filters || {};
            if (filters.datetime && filters.datetime.$gte && filters.datetime.$lt) {
                filters.datetime.$gte = new Date(filters.datetime.$gte);
                filters.datetime.$lt = new Date(filters.datetime.$lt);
            }
            const pageParameters = msg && msg.pageParameters || {};
            // if (!pageParameters.limit) {
            //     pageParameters.limit = 2000;
            // }
            const logs = await logRepository.find(filters, {
                    orderBy: {
                        datetime: msg.sortDirection && msg.sortDirection.toUpperCase() || 'DESC'
                    },
                    ...pageParameters
            });
            const totalCount = await logRepository.count(filters as any);
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
        const logRepository = new DataBaseHelper(Log);

        try {
            const nameFilter = `.*${msg.name || ''}.*`;
            const existingAttributes = msg.existingAttributes || [];
            const aggregateAttrResult = await logRepository.aggregate([
                { $project: { attributes: '$attributes' } },
                { $unwind: { path: '$attributes' } },
                { $match: { attributes: { $regex: nameFilter, $options: 'i' } } },
                { $match: { attributes: { $not: { $in: existingAttributes } } } },
                { $group: { _id: null, uniqueValues: { $addToSet: '$attributes' } } },
                { $unwind: { path: '$uniqueValues' } },
                { $limit: 20 },
                { $group: { _id: null, uniqueValues: { $addToSet: '$uniqueValues' } } }
            ]);
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
    ]
})
export class LoggerModule {}
