import { ApiResponse } from './helpers/api-response.js';
import {
    BinaryMessageResponse,
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    Formula,
    FormulaImportExport,
    PolicyImportExport,
    Users,
    NewNotifier
} from '@guardian/common';
import { EntityStatus, IOwner, MessageAPI, PolicyStatus, SchemaEntity, SchemaStatus } from '@guardian/interfaces';
import { getFormulasData, publishFormula } from './helpers/formulas-helpers.js';

/**
 * Connect to the message broker methods of working with formula.
 */
export async function formulasAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new formula
     *
     * @param payload - formula
     *
     * @returns {any} new formula
     */
    ApiResponse(MessageAPI.CREATE_FORMULA,
        async (msg: { formula: Formula, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { formula, owner } = msg;

                if (!formula) {
                    return new MessageError('Invalid object.');
                }

                const policyId = formula.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy) {
                    return new MessageError('Item does not exist.');
                }

                delete formula._id;
                delete formula.id;
                delete formula.status;
                delete formula.owner;
                formula.creator = owner.creator;
                formula.owner = owner.owner;
                formula.policyId = policy.id;
                formula.policyTopicId = policy.topicId;
                formula.policyInstanceTopicId = policy.instanceTopicId;
                formula.status = EntityStatus.DRAFT;
                formula.config = FormulaImportExport.validateConfig(formula.config);
                const row = await DatabaseServer.createFormula(formula);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get formulas
     *
     * @param {any} msg - filters
     *
     * @returns {any} - formulas
     */
    ApiResponse(MessageAPI.GET_FORMULAS,
        async (msg: { filters: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { filters, owner } = msg;
                const { policyId, pageIndex, pageSize } = filters;

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
                    'policyTopicId',
                    'policyInstanceTopicId',
                    'config'
                ];
                const query: any = {
                    owner: owner.owner
                };
                if (policyId) {
                    query.policyId = policyId;
                }
                const [items, count] = await DatabaseServer.getFormulasAndCount(query, otherOptions);
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get formula
     *
     * @param {any} msg - formula id
     *
     * @returns {any} - formula
     */
    ApiResponse(MessageAPI.GET_FORMULA,
        async (msg: { formulaId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { formulaId, owner } = msg;
                const item = await DatabaseServer.getFormulaById(formulaId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Update formula
     *
     * @param payload - formula
     *
     * @returns formula
     */
    ApiResponse(MessageAPI.UPDATE_FORMULA,
        async (msg: {
            formulaId: string,
            formula: Formula,
            owner: IOwner,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { formulaId, formula, owner } = msg;

                const item = await DatabaseServer.getFormulaById(formulaId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError('Item is published.');
                }

                item.name = formula.name;
                item.description = formula.description;
                item.config = FormulaImportExport.validateConfig(formula.config);
                const result = await DatabaseServer.updateFormula(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Delete formula
     *
     * @param {any} msg - formula id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_FORMULA,
        async (msg: { formulaId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { formulaId, owner } = msg;
                const item = await DatabaseServer.getFormulaById(formulaId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError('Item is published.');
                }
                await DatabaseServer.removeFormula(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Export formula
     *
     * @param {any} msg - Export formula parameters
     *
     * @returns {any} - zip file
     */
    ApiResponse(MessageAPI.EXPORT_FORMULA_FILE,
        async (msg: { formulaId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid export theme parameters');
                }
                const { formulaId, owner } = msg;

                const item = await DatabaseServer.getFormulaById(formulaId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }

                const zip = await FormulaImportExport.generate(item);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3,
                    },
                    platform: 'UNIX',
                });

                return new BinaryMessageResponse(file);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Import formula
     *
     * @param {any} msg - Import formula parameters
     *
     * @returns {any} - new formula
     */
    ApiResponse(MessageAPI.IMPORT_FORMULA_FILE,
        async (msg: { zip: any, policyId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { zip, policyId, owner } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }

                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy) {
                    return new MessageError('Item does not exist.');
                }

                let components = await FormulaImportExport.parseZipFile(Buffer.from(zip.data));
                components = await FormulaImportExport.updateUUID(components, policy);
                const { formula } = components;

                delete formula._id;
                delete formula.id;
                delete formula.status;
                delete formula.owner;
                formula.creator = owner.creator;
                formula.owner = owner.owner;
                formula.policyId = policyId;
                formula.policyTopicId = policy.topicId;
                formula.policyInstanceTopicId = policy.instanceTopicId;
                formula.status = EntityStatus.DRAFT;
                formula.config = FormulaImportExport.validateConfig(formula.config);
                const row = await DatabaseServer.createFormula(formula);

                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Preview formula
     *
     * @param {any} msg - zip file
     *
     * @returns {any} Preview
     */
    ApiResponse(MessageAPI.PREVIEW_FORMULA_FILE,
        async (msg: { zip: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await FormulaImportExport.parseZipFile(Buffer.from(zip.data));
                const { formula } = preview;
                return new MessageResponse(formula);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get formula relationships
     *
     * @param {any} msg - formula id
     *
     * @returns {any} relationships
     */
    ApiResponse(MessageAPI.GET_FORMULA_RELATIONSHIPS,
        async (msg: { formulaId: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { formulaId, owner } = msg;
                const item = await DatabaseServer.getFormulaById(formulaId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }

                const policyId = item.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy) {
                    return new MessageError('Item does not exist.');
                }

                const { schemas, toolSchemas } = await PolicyImportExport.fastLoadSchemas(policy);
                const all = [].concat(schemas, toolSchemas).filter((s) => s.entity !== SchemaEntity.NONE);

                const formulas = await DatabaseServer.getFormulas({
                    id: { $ne: formulaId },
                    policyId: policy.id
                });

                return new MessageResponse({
                    policy,
                    schemas: all,
                    formulas
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get Formulas data
     *
     * @param {any} msg - options
     *
     * @returns {any} - Formulas data
     */
    ApiResponse(MessageAPI.GET_FORMULAS_DATA,
        async (msg: {
            options: {
                policyId: string,
                schemaId: string,
                documentId: string,
                parentId: string
            }
            owner: IOwner,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { options, owner } = msg;
                const { policyId } = options;

                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyStatus.PUBLISH) {
                    return new MessageResponse(null);
                }

                const formulas = await DatabaseServer.getFormulas({ policyTopicId: policy.topicId });

                if (!formulas.length) {
                    return new MessageResponse(null);
                }

                const { document, relationships } = await getFormulasData(options, owner);
                const { schemas, toolSchemas } = await PolicyImportExport.fastLoadSchemas(policy);
                const all = [].concat(schemas, toolSchemas).filter((s) => s.status === SchemaStatus.PUBLISHED);
                return new MessageResponse({
                    formulas,
                    document,
                    relationships,
                    schemas: all
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Publish Formula
     *
     * @param {any} msg - Formula id
     *
     * @returns {any} - Formula
     */
    ApiResponse(MessageAPI.PUBLISH_FORMULA,
        async (msg: { formulaId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { formulaId, owner } = msg;

                const item = await DatabaseServer.getFormulaById(formulaId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError(`Item is already published.`);
                }

                const policyId = item.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyStatus.PUBLISH) {
                    return new MessageError('The policy has not published yet.');
                }

                const root = await (new Users()).getHederaAccount(owner.creator, userId);
                const result = await publishFormula(item, owner, root, NewNotifier.empty());
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });
}
