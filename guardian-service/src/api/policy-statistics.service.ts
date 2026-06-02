import { ApiResponse } from './helpers/api-response.js';
import { BinaryMessageResponse, DatabaseServer, MessageAction, MessageError, MessageResponse, MessageServer, NewNotifier, PinoLogger, PolicyStatistic, PolicyStatisticImportExport, StatisticAssessmentMessage, StatisticMessage, Users } from '@guardian/common';
import {
    EntityStatus,
    GenerateUUIDv4,
    IOwner,
    MessageAPI,
    PolicyStatus,
    Schema,
    SchemaEntity
} from '@guardian/interfaces';
import { findRelationships, generateSchema, generateVcDocument, getOrCreateTopic, publishConfig, uniqueDocuments } from './helpers/policy-statistics-helpers.js';
import { publishSchema } from '../helpers/import-helpers/index.js';

/**
 * Connect to the message broker methods of working with statistics.
 */
export async function statisticsAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new statistic definition
     *
     * @param payload - statistic definition
     *
     * @returns {any} new statistic definition
     */
    ApiResponse(MessageAPI.CREATE_STATISTIC_DEFINITION,
        async (msg: { definition: PolicyStatistic, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definition, owner } = msg;

                if (!definition) {
                    return new MessageError('Invalid object.');
                }

                const policyId = definition.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyStatus.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                delete definition._id;
                delete definition.id;
                delete definition.status;
                delete definition.owner;
                delete definition.messageId;
                definition.creator = owner.creator;
                definition.owner = owner.owner;
                definition.policyTopicId = policy.topicId;
                definition.policyInstanceTopicId = policy.instanceTopicId;
                definition.status = EntityStatus.DRAFT;
                definition.config = PolicyStatisticImportExport.validateConfig(definition.config);
                const row = await DatabaseServer.createStatistic(definition);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get statistic definitions
     *
     * @param {any} msg - filters
     *
     * @returns {any} - statistic definitions
     */
    ApiResponse(MessageAPI.GET_STATISTIC_DEFINITIONS,
        async (msg: { filters: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
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
                    'topicId',
                    'messageId',
                    'policyId',
                    'config'
                ];
                const query: any = {
                    $or: [
                        { status: EntityStatus.PUBLISHED },
                        { creator: owner.creator }
                    ]
                };
                if (policyInstanceTopicId) {
                    query.policyInstanceTopicId = policyInstanceTopicId;
                }
                const [items, count] = await DatabaseServer.getStatisticsAndCount(query, otherOptions);
                for (const item of items) {
                    (item as any).documents = await DatabaseServer.getStatisticAssessmentCount({
                        definitionId: item.id,
                        owner: owner.owner
                    });
                }
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get statistic definition
     *
     * @param {any} msg - statistic definition id
     *
     * @returns {any} - statistic definition
     */
    ApiResponse(MessageAPI.GET_STATISTIC_DEFINITION,
        async (msg: { definitionId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;
                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get relationships
     *
     * @param {any} msg - statistic definition id
     *
     * @returns {any} - relationships
     */
    ApiResponse(MessageAPI.GET_STATISTIC_RELATIONSHIPS,
        async (msg: { definitionId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;
                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }

                const policyId = item.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || !policy.topicId || policy.status !== PolicyStatus.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                const schemas = await PolicyStatisticImportExport.getPolicySchemas(policy);

                if (item.status === EntityStatus.PUBLISHED) {
                    const schema = await DatabaseServer.getSchema({ topicId: item.topicId });
                    return new MessageResponse({ policy, schemas, schema });
                } else {
                    return new MessageResponse({ policy, schemas });
                }
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Update statistic definition
     *
     * @param payload - statistic definition
     *
     * @returns statistic definition
     */
    ApiResponse(MessageAPI.UPDATE_STATISTIC_DEFINITION,
        async (msg: {
            definitionId: string,
            definition: PolicyStatistic,
            owner: IOwner,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, definition, owner } = msg;

                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!item || item.creator !== owner.creator) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError('Item published.');
                }

                item.name = definition.name;
                item.description = definition.description;
                item.method = definition.method;
                item.config = PolicyStatisticImportExport.validateConfig(definition.config);
                const result = await DatabaseServer.updateStatistic(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Delete statistic definition
     *
     * @param {any} msg - statistic definition id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_STATISTIC_DEFINITION,
        async (msg: { definitionId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;
                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!item || item.creator !== owner.creator) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError('Item published.');
                }
                await DatabaseServer.removeStatistic(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Publish statistic definition
     *
     * @param {any} msg - statistic definition id
     *
     * @returns {any} - statistic definition
     */
    ApiResponse(MessageAPI.PUBLISH_STATISTIC_DEFINITION,
        async (msg: { definitionId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;

                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!item || item.creator !== owner.creator) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError(`Item already published.`);
                }

                item.status = EntityStatus.PUBLISHED;
                item.config = publishConfig(item.config);

                const statMessage = new StatisticMessage(MessageAction.PublishPolicyStatistic);
                statMessage.setDocument(item);

                const topic = await getOrCreateTopic(item, userId);
                const user = await (new Users()).getHederaAccount(owner.creator, userId);
                const messageServer = new MessageServer({
                    operatorId: user.hederaAccountId,
                    operatorKey: user.hederaAccountKey,
                    signOptions: user.signOptions
                });

                const buffer = Buffer.from(JSON.stringify(item.config));
                item.contentFileId = await DatabaseServer.saveFile(GenerateUUIDv4(), buffer);

                const statMessageResult = await messageServer
                    .setTopicObject(topic)
                    .sendMessage(statMessage, {
                        sendToIPFS: true,
                        memo: null,
                        userId,
                        interception: null
                    });

                item.topicId = topic.topicId;
                item.messageId = statMessageResult.getId();

                const schema = await generateSchema(item.topicId, item.config, owner);
                await publishSchema(
                    schema,
                    owner,
                    messageServer,
                    MessageAction.PublishSchema,
                    NewNotifier.empty()
                );
                await DatabaseServer.createAndSaveSchema(schema);

                const result = await DatabaseServer.updateStatistic(item);
                return new MessageResponse(result);

            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get documents
     *
     * @param {any} msg - filters
     *
     * @returns {any} - documents
     */
    ApiResponse(MessageAPI.GET_STATISTIC_DOCUMENTS,
        async (msg: {
            definitionId: string,
            owner: IOwner,
            pageIndex?: string,
            pageSize?: string,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner, pageIndex, pageSize } = msg;

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
                    otherOptions.offset = 0;
                }

                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }

                const policyId: string = item.policyId;
                let rules = item.config?.rules || [];

                const schemas = await DatabaseServer.getSchemas({
                    topicId: item.policyTopicId,
                    entity: { $nin: [SchemaEntity.EVC] }
                });
                const schemasMap = new Set<string>(schemas.map((s) => s.iri));

                rules = rules.filter((r) => schemasMap.has(r.schemaId));

                const targets = rules.filter((r) => r.type === 'main');
                const sub = rules.filter((r) => r.type === 'related');
                const all = rules.filter((r) => r.type === 'unrelated');

                const targetSchemas = targets.map((r) => r.schemaId);
                const subSchemas = sub.map((r) => r.schemaId);
                const allSchemas = all.map((r) => r.schemaId);

                const allDocs = uniqueDocuments(await DatabaseServer.getStatisticDocuments({
                    policyId,
                    owner: owner.creator,
                    schema: { $in: allSchemas }
                }));

                const subDocs = uniqueDocuments(await DatabaseServer.getStatisticDocuments({
                    policyId,
                    owner: owner.creator,
                    schema: { $in: subSchemas }
                }));

                const targetDocs = await DatabaseServer.getStatisticDocuments({
                    policyId,
                    owner: owner.creator,
                    schema: { $in: targetSchemas }
                });

                const items: any[] = [];
                for (const target of uniqueDocuments(targetDocs)) {
                    items.push({
                        targetDocument: target,
                        relatedDocuments: await findRelationships(target, subDocs),
                        unrelatedDocuments: allDocs
                    })
                }
                return new MessageResponse({
                    items: items.slice(otherOptions.offset, otherOptions.offset + otherOptions.limit),
                    count: items.length
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Create statistic assessment
     *
     * @param payload - statistic assessment
     *
     * @returns {any} new statistic assessment
     */
    ApiResponse(MessageAPI.CREATE_STATISTIC_ASSESSMENT,
        async (msg: {
            definitionId: string,
            assessment: {
                document: any,
                target: string,
                relationships: string[]
            },
            owner: IOwner,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { definitionId, assessment, owner } = msg;

                if (!assessment || !assessment.document) {
                    return new MessageError('Invalid object.');
                }
                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status !== EntityStatus.PUBLISHED) {
                    return new MessageError('Item is not published.');
                }

                const schema = await DatabaseServer.getSchema({ topicId: item.topicId });
                const schemaObject = new Schema(schema);
                const vcObject = await generateVcDocument(assessment.document, schemaObject, owner);

                const topic = await getOrCreateTopic(item, userId);
                const user = await (new Users()).getHederaAccount(owner.creator, userId);
                const messageServer = new MessageServer({
                    operatorId: user.hederaAccountId,
                    operatorKey: user.hederaAccountKey,
                    signOptions: user.signOptions
                });

                const vcMessage = new StatisticAssessmentMessage(MessageAction.CreateStatisticAssessment);
                vcMessage.setDefinition(item);
                vcMessage.setDocument(vcObject);
                vcMessage.setTarget(assessment.target);
                vcMessage.setRelationships(assessment.relationships);
                const vcMessageResult = await messageServer
                    .setTopicObject(topic)
                    .sendMessage(vcMessage, {
                        sendToIPFS: true,
                        memo: null,
                        userId,
                        interception: null
                    });

                const row = await DatabaseServer.createStatisticAssessment({
                    definitionId: item.id,
                    policyId: item.policyId,
                    policyTopicId: item.policyTopicId,
                    policyInstanceTopicId: item.policyInstanceTopicId,
                    creator: owner.creator,
                    owner: owner.owner,
                    messageId: vcMessageResult.getId(),
                    topicId: vcMessageResult.getTopicId(),
                    target: vcMessageResult.getTarget(),
                    relationships: vcMessageResult.getRelationships(),
                    document: vcMessageResult.getDocument()
                });
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get statistic assessments
     *
     * @param {any} msg - filters
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC_ASSESSMENTS,
        async (msg: {
            definitionId: string,
            filters: any,
            owner: IOwner,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, filters, owner } = msg;
                const { pageIndex, pageSize } = filters;

                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status !== EntityStatus.PUBLISHED) {
                    return new MessageError('Item is not published.');
                }

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
                    'definitionId',
                    'policyId',
                    'creator',
                    'owner',
                    'target',
                    'relationships',
                    'topicId',
                    'messageId',
                    'document'
                ];

                const [items, count] = await DatabaseServer.getStatisticAssessmentsAndCount(
                    {
                        definitionId
                    },
                    otherOptions
                );
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get statistic assessment
     *
     * @param {any} msg - statistic id
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC_ASSESSMENT,
        async (msg: {
            definitionId: string,
            assessmentId: string,
            owner: IOwner,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, assessmentId, owner } = msg;
                const document = await DatabaseServer.getStatisticAssessment({
                    id: assessmentId,
                    definitionId,
                    owner: owner.owner
                });
                if (!document) {
                    return new MessageError('Item does not exist.');
                }

                return new MessageResponse(document);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get statistic assessment relationships
     *
     * @param {any} msg - statistic id
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC_ASSESSMENT_RELATIONSHIPS,
        async (msg: {
            definitionId: string,
            assessmentId: string,
            owner: IOwner,
            userId: string | null
        }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, assessmentId, owner } = msg;
                const document = await DatabaseServer.getStatisticAssessment({
                    id: assessmentId,
                    definitionId,
                    owner: owner.owner
                });
                if (!document) {
                    return new MessageError('Item does not exist.');
                }

                const relationships = await DatabaseServer.getStatisticDocuments({
                    messageId: { $in: document?.relationships }
                });

                const target = await DatabaseServer.getStatisticDocument({
                    messageId: document?.target
                });

                return new MessageResponse({
                    target,
                    relationships
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Export statistic definition
     *
     * @param {any} msg - Export statistic definition parameters
     *
     * @returns {any} - zip file
     */
    ApiResponse(MessageAPI.EXPORT_STATISTIC_DEFINITION_FILE,
        async (msg: { definitionId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid export theme parameters');
                }
                const { definitionId, owner } = msg;

                const item = await DatabaseServer.getStatisticById(definitionId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }

                const zip = await PolicyStatisticImportExport.generate(item);
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
     * Import statistic definition
     *
     * @param {any} msg - Import statistic definition parameters
     *
     * @returns {any} new statistic definition
     */
    ApiResponse(MessageAPI.IMPORT_STATISTIC_DEFINITION_FILE,
        async (msg: { zip: any, policyId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { zip, policyId, owner } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }

                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyStatus.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                const schemas = await PolicyStatisticImportExport.getPolicySchemas(policy);

                const preview = await PolicyStatisticImportExport.parseZipFile(Buffer.from(zip.data));
                const { definition } = preview;

                delete definition._id;
                delete definition.id;
                delete definition.status;
                delete definition.owner;
                delete definition.messageId;
                delete definition.topicId;
                definition.creator = owner.creator;
                definition.owner = owner.owner;
                definition.policyId = policyId;
                definition.policyTopicId = policy.topicId;
                definition.policyInstanceTopicId = policy.instanceTopicId;
                definition.status = EntityStatus.DRAFT;
                definition.config = PolicyStatisticImportExport.updateSchemas(schemas, definition.config);
                definition.config = PolicyStatisticImportExport.validateConfig(definition.config);
                const row = await DatabaseServer.createStatistic(definition);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Preview statistic definition
     *
     * @param {any} msg - zip file
     *
     * @returns {any} Preview
     */
    ApiResponse(MessageAPI.PREVIEW_STATISTIC_DEFINITION_FILE,
        async (msg: { zip: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await PolicyStatisticImportExport.parseZipFile(Buffer.from(zip.data));
                const { definition } = preview;
                return new MessageResponse(definition);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });
}
