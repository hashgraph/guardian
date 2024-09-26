import { ApiResponse } from './helpers/api-response.js';
import { DatabaseServer, MessageError, MessageResponse, PinoLogger, PolicyImportExport, PolicyStatistic } from '@guardian/common';
import { EntityStatus, IOwner, MessageAPI, PolicyType, SchemaStatus } from '@guardian/interfaces';

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
        async (msg: { statistic: PolicyStatistic, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { statistic, owner } = msg;

                if (!statistic) {
                    return new MessageError('Invalid object.');
                }

                const policyId = statistic.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                delete statistic._id;
                delete statistic.id;
                delete statistic.status;
                delete statistic.owner;
                delete statistic.messageId;
                statistic.creator = owner.creator;
                statistic.owner = owner.owner;
                statistic.status = EntityStatus.DRAFT;
                const row = await DatabaseServer.createStatistic(statistic);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get statistics
     *
     * @param {any} msg - filters
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTICS,
        async (msg: { filters: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
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

    /**
     * Get statistic
     *
     * @param {any} msg - statistic id
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                console.log(item);
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get relationships
     *
     * @param {any} msg - statistic id
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC_RELATIONSHIPS,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                const policyId = item.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }
                const { schemas, toolSchemas } = await PolicyImportExport.loadAllSchemas(policy);
                const all = [].concat(schemas, toolSchemas).filter((s) => s.status === SchemaStatus.PUBLISHED)
                return new MessageResponse({
                    policy,
                    schemas: all
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Update theme
     *
     * @param payload - theme
     *
     * @returns {Theme} theme
     */
    ApiResponse(MessageAPI.UPDATE_STATISTIC,
        async (msg: { id: string, statistic: PolicyStatistic, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, statistic, owner } = msg;

                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }

                item.name = statistic.name;
                item.description = statistic.description;
                item.method = statistic.method;
                item.config = statistic.config;

                const result = await DatabaseServer.updateStatistic(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Delete statistics
     *
     * @param {any} msg - statistic id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_STATISTIC,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                await DatabaseServer.removeStatistic(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Publish statistic
     *
     * @param {any} msg - statistic id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.PUBLISH_STATISTIC,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;

                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    throw new Error(`Item already published`);
                }
                item.status = EntityStatus.PUBLISHED;

                const result = await DatabaseServer.updateStatistic(item);
                return new MessageResponse(result);

            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get documents
     *
     * @param {any} msg - filters
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC_DOCUMENTS,
        async (msg: {
            id: string,
            owner: IOwner,
            pageIndex?: string,
            pageSize?: string
        }) => {
            try {

                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner, pageIndex, pageSize } = msg;

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

                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }

                // if (item.status !== EntityStatus.PUBLISHED) {
                //     throw new Error(`Item is not published`);
                // }

                const policyId: string = item.policyId;
                const variables: any[] = item.config?.variables;
                const schemasIds: Set<string> = new Set<string>();
                if (variables) {
                    for (const variable of variables) {
                        schemasIds.add(variable.schemaId);
                    }
                }

                const [items, count] = await DatabaseServer.getStatisticDocumentsAndCount(
                    {},
                    otherOptions
                );
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}
