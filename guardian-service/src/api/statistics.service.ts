import { ApiResponse } from './helpers/api-response.js';
import { DatabaseServer, ImportExportUtils, MessageError, MessageResponse, PinoLogger, PolicyImportExport } from '@guardian/common';
import { IOwner, MessageAPI, PolicyType, SchemaStatus } from '@guardian/interfaces';

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
                    // 'creator',
                    'owner',
                    'name',
                    'description',
                    'status',
                    'topicId',
                    'messageId',
                    'policyId'
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

    ApiResponse(MessageAPI.GET_STATISTIC,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tools parameter');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_STATISTIC_RELATIONSHIPS,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tools parameter');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                const policyId = item.policyId;
                console.log('1')
                const policy = await DatabaseServer.getPolicyById(policyId);
                console.log('2')
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }
                console.log('3')
                const { schemas } = await PolicyImportExport.loadPolicyComponents(policy);
                console.log('4')
                return new MessageResponse({
                    policy,
                    schemas: schemas.filter((s) => s.status === SchemaStatus.PUBLISHED)
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}
