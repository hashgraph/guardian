import { ApiResponse } from './helpers/api-response.js';
import { DatabaseServer, MessageError, MessageResponse, PinoLogger, PolicyImportExport, SchemaRule } from '@guardian/common';
import { EntityStatus, IOwner, MessageAPI, PolicyType, SchemaStatus } from '@guardian/interfaces';
import { validateRuleConfig } from './helpers/schema-rules-helpers.js';


async function getSchemaRuleData(
    item: SchemaRule,
    option: {
        policyId: string,
        schemaId: string,
        documentId: string,
        parentId: string
    },
    owner: IOwner
) {
    const { policyId, schemaId, documentId, parentId } = option;
    return {
        rules: item,
        document: null,
        relationships: []
    }
}

/**
 * Connect to the message broker methods of working with schema rules.
 */
export async function schemaRulesAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new schema rule
     *
     * @param payload - schema rule
     *
     * @returns {any} new schema rule
     */
    ApiResponse(MessageAPI.CREATE_SCHEMA_RULE,
        async (msg: { rule: SchemaRule, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { rule, owner } = msg;

                if (!rule) {
                    return new MessageError('Invalid object.');
                }

                const policyId = rule.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                delete rule._id;
                delete rule.id;
                delete rule.status;
                delete rule.owner;
                rule.creator = owner.creator;
                rule.owner = owner.owner;
                rule.policyTopicId = policy.topicId;
                rule.policyInstanceTopicId = policy.instanceTopicId;
                rule.status = EntityStatus.DRAFT;
                rule.config = validateRuleConfig(rule.config);
                const row = await DatabaseServer.createSchemaRule(rule);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get schema rules
     *
     * @param {any} msg - filters
     *
     * @returns {any} - schema rules
     */
    ApiResponse(MessageAPI.GET_SCHEMA_RULES,
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
                const [items, count] = await DatabaseServer.getSchemaRulesAndCount(query, otherOptions);
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get schema rule
     *
     * @param {any} msg - schema rule id
     *
     * @returns {any} - schema rule
     */
    ApiResponse(MessageAPI.GET_SCHEMA_RULE,
        async (msg: { ruleId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { ruleId, owner } = msg;
                const item = await DatabaseServer.getSchemaRuleById(ruleId);
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
     * Get relationships
     *
     * @param {any} msg - schema rule id
     *
     * @returns {any} - relationships
     */
    ApiResponse(MessageAPI.GET_SCHEMA_RULE_RELATIONSHIPS,
        async (msg: { ruleId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { ruleId, owner } = msg;
                const item = await DatabaseServer.getSchemaRuleById(ruleId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }
                const policyId = item.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }
                const { schemas, toolSchemas } = await PolicyImportExport.loadAllSchemas(policy);
                const all = []
                    .concat(schemas, toolSchemas)
                    .filter((s) => s.status === SchemaStatus.PUBLISHED && s.entity !== 'EVC');

                return new MessageResponse({
                    policy,
                    schemas: all,
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Update schema rule
     *
     * @param payload - schema rule
     *
     * @returns schema rule
     */
    ApiResponse(MessageAPI.UPDATE_SCHEMA_RULE,
        async (msg: {
            ruleId: string,
            rule: SchemaRule,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { ruleId, rule, owner } = msg;

                const item = await DatabaseServer.getSchemaRuleById(ruleId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.ACTIVE) {
                    return new MessageError('Item is active.');
                }

                item.name = rule.name;
                item.description = rule.description;
                item.config = validateRuleConfig(rule.config);
                const result = await DatabaseServer.updateSchemaRule(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Delete schema rule
     *
     * @param {any} msg - schema rule id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_SCHEMA_RULE,
        async (msg: { ruleId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { ruleId, owner } = msg;
                const item = await DatabaseServer.getSchemaRuleById(ruleId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.ACTIVE) {
                    return new MessageError('Item is active.');
                }
                await DatabaseServer.removeSchemaRule(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Activate schema rule
     *
     * @param {any} msg - schema rule id
     *
     * @returns {any} - schema rule
     */
    ApiResponse(MessageAPI.ACTIVATE_SCHEMA_RULE,
        async (msg: { ruleId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { ruleId, owner } = msg;

                const item = await DatabaseServer.getSchemaRuleById(ruleId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.ACTIVE) {
                    return new MessageError(`Item is already active.`);
                }

                item.status = EntityStatus.ACTIVE;

                const result = await DatabaseServer.updateSchemaRule(item);
                return new MessageResponse(result);

            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Inactivate schema rule
     *
     * @param {any} msg - schema rule id
     *
     * @returns {any} - schema rule
     */
    ApiResponse(MessageAPI.INACTIVATE_SCHEMA_RULE,
        async (msg: { ruleId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { ruleId, owner } = msg;

                const item = await DatabaseServer.getSchemaRuleById(ruleId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status !== EntityStatus.ACTIVE) {
                    return new MessageError(`Item is already inactive.`);
                }

                item.status = EntityStatus.DRAFT;

                const result = await DatabaseServer.updateSchemaRule(item);
                return new MessageResponse(result);

            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
      * Inactivate schema rule
      *
      * @param {any} msg - schema rule id
      *
      * @returns {any} - schema rule
      */
    ApiResponse(MessageAPI.GET_SCHEMA_RULE_DATA,
        async (msg: {
            options: {
                policyId: string,
                schemaId: string,
                documentId: string,
                parentId: string,
            }
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { options, owner } = msg;
                const { policyId } = options;

                const items = await DatabaseServer.getSchemaRules({
                    policyId,
                    status: EntityStatus.ACTIVE
                });

                const result = [];
                for (const item of items) {
                    const data = await getSchemaRuleData(item, options, owner);
                    if (data) {
                        result.push(data);
                    }
                }
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}