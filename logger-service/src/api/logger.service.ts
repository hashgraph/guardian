import { ILog, IPageParameters, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { Log } from '@entity/log';

export const loggerAPI = async function (
    channel: any,
    logRepository: MongoRepository<Log>
): Promise<void> {
    /**
     * Add log message
     * 
     * @param {Message} [payload] - Log message
     * 
     */
    channel.response(MessageAPI.WRITE_LOG, async (msg, res) => {
        try {
            const message = msg.payload as ILog;
            if (!message) {
                throw new Error("Log message is empty");
            }
            await logRepository.save(message);
            res.send(new MessageResponse(null));
        }
        catch (e) {
            res.send(new MessageError(e));
        }
    })

    /**
     * Get logs.
     * 
     * @param {any} [payload.filters] - Response type
     * @param {IPageParameters} [payload.pageParameters] - Page parameters
     * 
     * @return {any} - Logs
     */
    channel.response(MessageAPI.GET_LOGS, async (msg, res) => {
        try {
            const filters = msg.payload && msg.payload.filters || {};
            if (filters.datetime && filters.datetime.$gte && filters.datetime.$lt) {
                filters.datetime.$gte = new Date(filters.datetime.$gte);
                filters.datetime.$lt = new Date(filters.datetime.$lt);
            }
            const pageParameters = msg.payload && msg.payload.pageParameters || {};
            const allFilters = {
                where: filters,
                order: {
                    datetime: msg.payload.sortDirection && msg.payload.sortDirection.toUpperCase() || "DESC"
                },
                ...pageParameters
            };
            let logs = await logRepository.find(allFilters);
            let totalCount = await logRepository.count(filters);
            res.send(new MessageResponse({
                logs,
                totalCount
            }));
        }
        catch (e) {
            res.send(new MessageError(e.toString()));
        }
    })

    /**
     * Get attributes.
     * 
     * @param {any} [payload.name] - Name to filter
     * 
     * @return {any} - Attributes
     */
    channel.response(MessageAPI.GET_ATTRIBUTES, async (msg, res) => {
        try {
            const nameFilter = `.*${msg.payload.name || ""}.*`;
            let attrCursor = await logRepository.aggregate([
                { $project: { attributes : "$attributes" }},
                { $unwind: { path: "$attributes" }},
                { $match: { attributes: { $regex: nameFilter, $options: 'i' }}},
                { $group: { _id: null, uniqueValues: { $addToSet: "$attributes" }}},
                { $unwind: { path: "$uniqueValues" }},
                { $limit: 20 },
                { $group: { _id: null, uniqueValues: { $addToSet: "$uniqueValues" }}}
            ]);
            const attrObject = await attrCursor.next();
            attrCursor.close();
            res.send(new MessageResponse(attrObject?.uniqueValues?.sort() || []));
        }
        catch (e) {
            res.send(new MessageError(e.toString()));
        }
    })
}
