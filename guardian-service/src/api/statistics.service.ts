import { ApiResponse } from './helpers/api-response.js';
import { DatabaseServer, MessageError, MessageResponse, PinoLogger } from '@guardian/common';
import { IOwner, MessageAPI } from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with statistics.
 */
export async function statisticsAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new statistic
     *
     * @param payload - statistic
     *
     * @returns {any} new statistic
     */
    ApiResponse(MessageAPI.CREATE_STATISTIC,
        async (msg: { statistic: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const { statistic, owner } = msg;
                if (statistic) {
                    delete statistic._id;
                    delete statistic.id;
                    delete statistic.status;
                    delete statistic.owner;
                    delete statistic.messageId;
                }
                statistic.creator = owner.creator;
                statistic.owner = owner.owner;
                statistic.status = 'Draft';
                const row = await DatabaseServer.createStatistic(statistic);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_STATISTICS,
        async (msg: { filters: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tools parameter');
                }
                const { filters, owner } = msg;
                const { pageIndex, pageSize } = filters;

                const otherOptions: any = {};
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }
                otherOptions.fields = [
                    'id',
                    'creator',
                    'owner',
                    'name',
                    'description'
                ];
                const [items, count] = await DatabaseServer.getStatisticsAndCount(
                    {
                        owner: owner.owner
                    },
                    otherOptions
                );
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}
