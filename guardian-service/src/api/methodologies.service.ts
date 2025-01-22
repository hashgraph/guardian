import { ApiResponse } from './helpers/api-response.js';
import {
    BinaryMessageResponse,
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    Methodology,
    MethodologyImportExport,
    PolicyImportExport
} from '@guardian/common';
import { EntityStatus, IOwner, MessageAPI, PolicyType, SchemaStatus } from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with methodology.
 */
export async function methodologiesAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new methodology
     *
     * @param payload - methodology
     *
     * @returns {any} new methodology
     */
    ApiResponse(MessageAPI.CREATE_METHODOLOGY,
        async (msg: { methodology: Methodology, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { methodology, owner } = msg;

                if (!methodology) {
                    return new MessageError('Invalid object.');
                }

                const policyId = methodology.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                delete methodology._id;
                delete methodology.id;
                delete methodology.status;
                delete methodology.owner;
                methodology.creator = owner.creator;
                methodology.owner = owner.owner;
                methodology.policyId = policy.id;
                methodology.policyTopicId = policy.topicId;
                methodology.status = EntityStatus.DRAFT;
                methodology.config = MethodologyImportExport.validateConfig(methodology.config);
                const row = await DatabaseServer.createMethodology(methodology);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get methodologies
     *
     * @param {any} msg - filters
     *
     * @returns {any} - methodologies
     */
    ApiResponse(MessageAPI.GET_METHODOLOGIES,
        async (msg: { filters: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { filters, owner } = msg;
                const { policyInstanceTopicId, pageIndex, pageSize } = filters;

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
                    'policyId',
                    'config'
                ];
                const query: any = {
                    owner: owner.owner
                };
                if (policyInstanceTopicId) {
                    query.policyInstanceTopicId = policyInstanceTopicId;
                }
                const [items, count] = await DatabaseServer.getMethodologiesAndCount(query, otherOptions);
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get methodology
     *
     * @param {any} msg - methodology id
     *
     * @returns {any} - methodology
     */
    ApiResponse(MessageAPI.GET_METHODOLOGY,
        async (msg: { methodologyId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { methodologyId, owner } = msg;
                const item = await DatabaseServer.getMethodologyById(methodologyId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Update methodology
     *
     * @param payload - methodology
     *
     * @returns methodology
     */
    ApiResponse(MessageAPI.UPDATE_METHODOLOGY,
        async (msg: {
            methodologyId: string,
            methodology: Methodology,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { methodologyId, methodology, owner } = msg;

                const item = await DatabaseServer.getMethodologyById(methodologyId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.ACTIVE) {
                    return new MessageError('Item is active.');
                }

                item.name = methodology.name;
                item.description = methodology.description;
                item.config = MethodologyImportExport.validateConfig(methodology.config);
                const result = await DatabaseServer.updateMethodology(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Delete methodology
     *
     * @param {any} msg - methodology id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_METHODOLOGY,
        async (msg: { methodologyId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { methodologyId, owner } = msg;
                const item = await DatabaseServer.getMethodologyById(methodologyId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.ACTIVE) {
                    return new MessageError('Item is active.');
                }
                await DatabaseServer.removeMethodology(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Export methodology
     *
     * @param {any} msg - Export methodology parameters
     *
     * @returns {any} - zip file
     */
    ApiResponse(MessageAPI.EXPORT_METHODOLOGY_FILE,
        async (msg: { methodologyId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid export theme parameters');
                }
                const { methodologyId, owner } = msg;

                const item = await DatabaseServer.getMethodologyById(methodologyId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }

                const zip = await MethodologyImportExport.generate(item);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3,
                    },
                });

                return new BinaryMessageResponse(file);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Import methodology
     *
     * @param {any} msg - Import methodology parameters
     *
     * @returns {any} - new methodology
     */
    ApiResponse(MessageAPI.IMPORT_METHODOLOGY_FILE,
        async (msg: { zip: any, policyId: string, owner: IOwner }) => {
            try {
                const { zip, policyId, owner } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }

                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                const preview = await MethodologyImportExport.parseZipFile(Buffer.from(zip.data));
                const { methodology } = preview;

                delete methodology._id;
                delete methodology.id;
                delete methodology.status;
                delete methodology.owner;
                methodology.creator = owner.creator;
                methodology.owner = owner.owner;
                methodology.policyId = policyId;
                methodology.status = EntityStatus.DRAFT;
                methodology.config = MethodologyImportExport.validateConfig(methodology.config);
                const row = await DatabaseServer.createMethodology(methodology);

                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Preview methodology
     *
     * @param {any} msg - zip file
     *
     * @returns {any} Preview
     */
    ApiResponse(MessageAPI.PREVIEW_METHODOLOGY_FILE,
        async (msg: { zip: any, owner: IOwner }) => {
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await MethodologyImportExport.parseZipFile(Buffer.from(zip.data));
                const { methodology } = preview;
                return new MessageResponse(methodology);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get methodology relationships
     *
     * @param {any} msg - methodology id
     *
     * @returns {any} relationships
     */
    ApiResponse(MessageAPI.GET_METHODOLOGY_RELATIONSHIPS,
        async (msg: { methodologyId: any, owner: IOwner }) => {
            try {
                const { methodologyId, owner } = msg;
                const item = await DatabaseServer.getMethodologyById(methodologyId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }

                const policyId = item.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                const { schemas, toolSchemas } = await PolicyImportExport.loadAllSchemas(policy);
                const all = [].concat(schemas, toolSchemas);

                const formulas = await DatabaseServer.getMethodologies({ 
                    id: { $ne: methodologyId },
                    policyId: policy.id 
                });

                return new MessageResponse({
                    policy,
                    schemas: all,
                    formulas: formulas
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

}