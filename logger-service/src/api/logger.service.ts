import { MongoRepository } from 'typeorm';
import { Log } from '@entity/log';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { MessageAPI, ILog, IGetLogsMessage, IGetLogsResponse, IGetLogAttributesMessage } from '@guardian/interfaces';


export const loggerAPI = async function (
    channel: MessageBrokerChannel,
    logRepository: MongoRepository<Log>
): Promise<void> {
    /**
     * Add log message
     *
     * @param {Message} [payload] - Log message
     *
     */
    channel.response<ILog, any>(MessageAPI.WRITE_LOG, async (message) => {
        try {
            if (!message) {
                throw new Error("Log message is empty");
            }
            await logRepository.save(message);
            return new MessageResponse(true);
        }
        catch (error) {
            return new MessageError(error);
        }
    })

    /**
     * Get application logs.
     *
     * @param {any} [msg.filters] - logs filter options
     * @param {IPageParameters} [msg.pageParameters] - Page parameters
     *
     * @return {any} - Logs
     */
    channel.response<IGetLogsMessage, IGetLogsResponse>(MessageAPI.GET_LOGS, async (msg) => {
        try {
            const filters = msg && msg.filters || {};
            if (filters.datetime && filters.datetime.$gte && filters.datetime.$lt) {
                filters.datetime.$gte = new Date(filters.datetime.$gte);
                filters.datetime.$lt = new Date(filters.datetime.$lt);
            }
            const pageParameters = msg && msg.pageParameters || {};
            const allFilters = {
                where: filters,
                order: {
                    datetime: msg.sortDirection && msg.sortDirection.toUpperCase() || "DESC"
                },
                ...pageParameters
            };
            let logs = await logRepository.find(allFilters as any);
            let totalCount = await logRepository.count(filters as any);
            return new MessageResponse({
                logs,
                totalCount
            });
        }
        catch (error) {
            return new MessageError(error);
        }
    })

    /**
     * Get attributes.
     *
     * @param {any} [payload.name] - Name to filter
     *
     * @return {any} - Attributes
     */
    channel.response<IGetLogAttributesMessage, any>(MessageAPI.GET_ATTRIBUTES, async (msg) => {
        try {
            const nameFilter = `.*${msg.name || ""}.*`;
            const existingAttributes = msg.existingAttributes || [];
            let attrCursor = await logRepository.aggregate([
                { $project: { attributes: "$attributes" } },
                { $unwind: { path: "$attributes" } },
                { $match: { attributes: { $regex: nameFilter, $options: 'i' } } },
                { $match: { attributes: { $not: { $in: existingAttributes } } } },
                { $group: { _id: null, uniqueValues: { $addToSet: "$attributes" } } },
                { $unwind: { path: "$uniqueValues" } },
                { $limit: 20 },
                { $group: { _id: null, uniqueValues: { $addToSet: "$uniqueValues" } } }
            ]);
            const attrObject = await attrCursor.next();
            attrCursor.close();
            return new MessageResponse(attrObject?.uniqueValues?.sort() || []);
        }
        catch (error) {
            return new MessageError<string>(error.toString());
        }
    })
}
