import { Log } from '@entity/log';
import { NatsConnection } from 'nats';
import {
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Singleton,
    NatsService,
    ZipCodec, InboundMessageIdentityDeserializer, OutboundResponseIdentitySerializer
} from '@guardian/common';
import {
    MessageAPI,
    ILog,
    IGetLogsMessage,
    IGetLogsResponse,
    IGetLogAttributesMessage,
    GenerateUUIDv4
} from '@guardian/interfaces';
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
    @MessagePattern(MessageAPI.WRITE_LOG)
    writeLog(@Payload() data: number[], @Ctx() context: NatsContext) {
        console.log(data, context);
    }
}

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
                serializer: new OutboundResponseIdentitySerializer(),
                deserializer: new InboundMessageIdentityDeserializer(),
                codec: ZipCodec()
            }
        }]),
    ],
    controllers: [
        LoggerService
    ]
})
export class LoggerModule {}

// /**
//  * Logegr API
//  * @param channel
//  * @param logRepository
//  */
// export async function loggerAPI(
//     logRepository: DataBaseHelper<Log>
// ): Promise<void> {
//     /**
//      * Add log message
//      *
//      * @param {Message} [payload] - Log message
//      *
//      */
//     channel.getMessages<ILog, any>(MessageAPI.WRITE_LOG, async (message) => {
//         try {
//             if (!message) {
//                 throw new Error('Log message is empty');
//             }
//
//             await logRepository.save(message);
//
//             // if (message.type === LogType.ERROR) {
//             //     channel.publish(ExternalMessageEvents.ERROR_LOG, message);
//             // }
//             return new MessageResponse(true);
//         }
//         catch (error) {
//             return new MessageError(error);
//         }
//     })
//
//     /**
//      * Get application logs.
//      *
//      * @param {any} [msg.filters] - logs filter options
//      * @param {IPageParameters} [msg.pageParameters] - Page parameters
//      *
//      * @return {any} - Logs
//      */
//     channel.getMessages<IGetLogsMessage, IGetLogsResponse>(MessageAPI.GET_LOGS, async (msg) => {
//         try {
//             const filters = msg && msg.filters || {};
//             if (filters.datetime && filters.datetime.$gte && filters.datetime.$lt) {
//                 filters.datetime.$gte = new Date(filters.datetime.$gte);
//                 filters.datetime.$lt = new Date(filters.datetime.$lt);
//             }
//             const pageParameters = msg && msg.pageParameters || {};
//             const logs = await logRepository.find(filters, {
//                     orderBy: {
//                         datetime: msg.sortDirection && msg.sortDirection.toUpperCase() || 'DESC'
//                     },
//                     ...pageParameters
//             });
//             const totalCount = await logRepository.count(filters as any);
//             return new MessageResponse({
//                 logs,
//                 totalCount
//             });
//         }
//         catch (error) {
//             return new MessageError(error);
//         }
//     })
//
//     /**
//      * Get attributes.
//      *
//      * @param {any} [payload.name] - Name to filter
//      *
//      * @return {any} - Attributes
//      */
//     channel.getMessages<IGetLogAttributesMessage, any>(MessageAPI.GET_ATTRIBUTES, async (msg) => {
//         try {
//             const nameFilter = `.*${msg.name || ''}.*`;
//             const existingAttributes = msg.existingAttributes || [];
//             const aggregateAttrResult = await logRepository.aggregate([
//                 { $project: { attributes: '$attributes' } },
//                 { $unwind: { path: '$attributes' } },
//                 { $match: { attributes: { $regex: nameFilter, $options: 'i' } } },
//                 { $match: { attributes: { $not: { $in: existingAttributes } } } },
//                 { $group: { _id: null, uniqueValues: { $addToSet: '$attributes' } } },
//                 { $unwind: { path: '$uniqueValues' } },
//                 { $limit: 20 },
//                 { $group: { _id: null, uniqueValues: { $addToSet: '$uniqueValues' } } }
//             ]);
//             return new MessageResponse(aggregateAttrResult[0].uniqueValues?.sort() || []);
//         }
//         catch (error) {
//             return new MessageError<string>(error.toString());
//         }
//     })
// }
