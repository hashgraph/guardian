import { ApiResponse } from './helpers/api-response.js';
import {
    BinaryMessageResponse,
    DatabaseServer,
    LabelDocumentMessage,
    LabelMessage,
    MessageAction,
    MessageError,
    MessageResponse,
    MessageServer,
    PinoLogger,
    PolicyImportExport,
    PolicyLabel,
    PolicyLabelImportExport,
    Users,
    Schema as SchemaCollection,
    RunFunctionAsync,
} from '@guardian/common';
import { EntityStatus, IOwner, LabelValidators, MessageAPI, PolicyType, Schema, SchemaStatus } from '@guardian/interfaces';
import { findRelationships, generateSchema, generateVpDocument, getOrCreateTopic, publishLabelConfig } from './helpers/policy-labels-helpers.js';
import { publishSchemas, saveSchemas } from './helpers/index.js';
import { emptyNotifier, initNotifier, INotifier } from '../helpers/notifier.js';

async function publishPolicyLabel(
    item: PolicyLabel,
    owner: IOwner,
    notifier: INotifier,
    logger: PinoLogger
): Promise<PolicyLabel> {
    item.status = EntityStatus.PUBLISHED;
    item.config = PolicyLabelImportExport.validateConfig(item.config);
    item.config = publishLabelConfig(item.config);

    notifier.start('Create topic');
    const topic = await getOrCreateTopic(item);
    const user = await (new Users()).getHederaAccount(owner.creator);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, user.signOptions);
    messageServer.setTopicObject(topic);

    notifier.completedAndStart('Generate schemas');
    const schemas = await generateSchema(topic.topicId, item.config, owner);
    const schemaList = new Set<SchemaCollection>();
    for (const { schema } of schemas) {
        schemaList.add(schema);
    }

    notifier.completedAndStart('Publish schemas');
    await publishSchemas(schemaList, owner, messageServer, MessageAction.PublishSchema);
    await saveSchemas(schemaList);
    for (const { node, schema } of schemas) {
        node.schemaId = schema.iri;
    }

    notifier.completedAndStart('Publish label');
    const zip = await PolicyLabelImportExport.generate(item);
    const buffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 3
        }
    });

    const statMessage = new LabelMessage(MessageAction.PublishPolicyLabel);
    statMessage.setDocument(item, buffer);
    const statMessageResult = await messageServer
        .sendMessage(statMessage);

    item.topicId = topic.topicId;
    item.messageId = statMessageResult.getId();

    const result = await DatabaseServer.updatePolicyLabel(item);
    return result;
}

/**
 * Connect to the message broker methods of working with policy labels.
 */
export async function policyLabelsAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new policy label
     *
     * @param payload - policy label
     *
     * @returns {any} new policy label
     */
    ApiResponse(MessageAPI.CREATE_POLICY_LABEL,
        async (msg: { label: PolicyLabel, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { label, owner } = msg;

                if (!label) {
                    return new MessageError('Invalid object.');
                }

                const policyId = label.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                delete label._id;
                delete label.id;
                delete label.status;
                delete label.owner;
                label.creator = owner.creator;
                label.owner = owner.owner;
                label.policyTopicId = policy.topicId;
                label.policyInstanceTopicId = policy.instanceTopicId;
                label.status = EntityStatus.DRAFT;
                label.config = PolicyLabelImportExport.validateConfig(label.config);
                const row = await DatabaseServer.createPolicyLabel(label);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get policy labels
     *
     * @param {any} msg - filters
     *
     * @returns {any} - policy labels
     */
    ApiResponse(MessageAPI.GET_POLICY_LABELS,
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
                    'config',
                    'topicId',
                    'messageId'
                ];
                const query: any = {
                    owner: owner.owner
                };
                if (policyInstanceTopicId) {
                    query.policyInstanceTopicId = policyInstanceTopicId;
                }
                const [items, count] = await DatabaseServer.getPolicyLabelsAndCount(query, otherOptions);
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get policy label
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.GET_POLICY_LABEL,
        async (msg: { definitionId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;
                const item = await DatabaseServer.getPolicyLabelById(definitionId);
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
     * @param {any} msg - policy label id
     *
     * @returns {any} - relationships
     */
    ApiResponse(MessageAPI.GET_POLICY_LABEL_RELATIONSHIPS,
        async (msg: { definitionId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;
                const item = await DatabaseServer.getPolicyLabelById(definitionId);
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

                const documentsSchemas = await DatabaseServer.getSchemas({ topicId: item.topicId });

                return new MessageResponse({
                    policy,
                    policySchemas: all,
                    documentsSchemas
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Update policy label
     *
     * @param payload - policy label
     *
     * @returns policy label
     */
    ApiResponse(MessageAPI.UPDATE_POLICY_LABEL,
        async (msg: {
            definitionId: string,
            label: PolicyLabel,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, label, owner } = msg;

                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.ACTIVE) {
                    return new MessageError('Item is active.');
                }

                item.name = label.name;
                item.description = label.description;
                item.config = PolicyLabelImportExport.validateConfig(label.config);
                const result = await DatabaseServer.updatePolicyLabel(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Delete policy label
     *
     * @param {any} msg - policy label id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_POLICY_LABEL,
        async (msg: { definitionId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;
                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.ACTIVE) {
                    return new MessageError('Item is active.');
                }
                await DatabaseServer.removePolicyLabel(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Publish policy label
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.PUBLISH_POLICY_LABEL,
        async (msg: { definitionId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner } = msg;

                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError(`Item is already active.`);
                }

                const result = await publishPolicyLabel(item, owner, emptyNotifier(), logger);
                return new MessageResponse(result);

            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Publish policy label
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.PUBLISH_POLICY_LABEL_ASYNC,
        async (msg: { definitionId: string, owner: IOwner, task: any }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, owner, task } = msg;

                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError(`Item is already active.`);
                }

                const notifier = await initNotifier(task);
                RunFunctionAsync(async () => {
                    const result = await publishPolicyLabel(item, owner, notifier, logger);
                    notifier.result(result);
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE']);
                    notifier.error(error);
                });

                return new MessageResponse(task);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Export policy label
     *
     * @param {any} msg - Export policy label parameters
     *
     * @returns {any} - zip file
     */
    ApiResponse(MessageAPI.EXPORT_POLICY_LABEL_FILE,
        async (msg: { definitionId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid export theme parameters');
                }
                const { definitionId, owner } = msg;

                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }

                const zip = await PolicyLabelImportExport.generate(item);
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
     * Import policy label
     *
     * @param {any} msg - Import policy label parameters
     *
     * @returns {any} - new policy label
     */
    ApiResponse(MessageAPI.IMPORT_POLICY_LABEL_FILE,
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

                const preview = await PolicyLabelImportExport.parseZipFile(Buffer.from(zip.data));
                const { label } = preview;

                delete label._id;
                delete label.id;
                delete label.status;
                delete label.owner;
                label.creator = owner.creator;
                label.owner = owner.owner;
                label.policyId = policyId;
                label.policyTopicId = policy.topicId;
                label.policyInstanceTopicId = policy.instanceTopicId;
                label.status = EntityStatus.DRAFT;
                label.config = PolicyLabelImportExport.validateConfig(label.config);
                const row = await DatabaseServer.createPolicyLabel(label);

                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Preview policy label
     *
     * @param {any} msg - zip file
     *
     * @returns {any} Preview
     */
    ApiResponse(MessageAPI.PREVIEW_POLICY_LABEL_FILE,
        async (msg: { zip: any, owner: IOwner }) => {
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await PolicyLabelImportExport.parseZipFile(Buffer.from(zip.data));
                const { label } = preview;
                return new MessageResponse(label);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get components
     *
     * @param {any} msg - filters
     *
     * @returns {any} components
     */
    ApiResponse(MessageAPI.SEARCH_POLICY_LABEL_COMPONENTS,
        async (msg: {
            options: {
                text?: string,
                owner?: string,
                components?: string,
            }, owner: IOwner
        }) => {
            try {
                const { options } = msg;

                const filter: any = {
                    $and: [
                        {
                            status: EntityStatus.PUBLISHED
                        }
                    ]
                };
                if (options.text) {
                    const keywords = options.text.split(' ');
                    for (const keyword of keywords) {
                        filter.$and.push({
                            'name': {
                                $regex: `.*${keyword.trim()}.*`,
                                $options: 'si',
                            },
                        });
                    }
                }
                if (options.owner) {
                    filter.$and.push({
                        $or: [
                            {
                                owner: options.owner
                            },
                            {
                                creator: options.owner
                            }
                        ]
                    });
                }

                if (options.components === 'all') {
                    const labels = await DatabaseServer.getPolicyLabels(filter);
                    const statistics = await DatabaseServer.getStatistics(filter);
                    return new MessageResponse({ labels, statistics });
                } else if (options.components === 'label') {
                    const labels = await DatabaseServer.getPolicyLabels(filter);
                    return new MessageResponse({ labels, statistics: [] });
                } else if (options.components === 'statistic') {
                    const statistics = await DatabaseServer.getStatistics(filter);
                    return new MessageResponse({ labels: [], statistics });
                } else {
                    return new MessageResponse({ labels: [], statistics: [] });
                }
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
     * @returns {any} - documents
     */
    ApiResponse(MessageAPI.GET_POLICY_LABEL_TOKENS,
        async (msg: {
            definitionId: string,
            owner: IOwner,
            pageIndex?: string,
            pageSize?: string
        }) => {
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

                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }

                const policyId: string = item.policyId;

                const vps = await DatabaseServer.getVPs({
                    type: 'mint',
                    policyId,
                    owner: owner.creator,
                }, otherOptions);

                return new MessageResponse({
                    items: vps,
                    count: vps.length
                });
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
     * @returns {any} - documents
     */
    ApiResponse(MessageAPI.GET_POLICY_LABEL_TOKEN_DOCUMENTS,
        async (msg: {
            documentId: string,
            definitionId: string,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { documentId, definitionId, owner } = msg;

                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }

                const policyId: string = item.policyId;

                const vp = await DatabaseServer.getVP({
                    id: documentId,
                    type: 'mint',
                    policyId,
                    owner: owner.creator,
                });

                if (!vp) {
                    return new MessageError('Item does not exist.');
                }

                const relationships = await findRelationships(vp);

                return new MessageResponse({
                    targetDocument: vp,
                    relatedDocuments: relationships,
                    unrelatedDocuments: []
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Create label document
     *
     * @param payload - label document
     *
     * @returns {any} new label document
     */
    ApiResponse(MessageAPI.CREATE_POLICY_LABEL_DOCUMENT,
        async (msg: {
            definitionId: string,
            data: {
                target: string,
                documents: any[]
            },
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { definitionId, data, owner } = msg;

                if (!data || !Array.isArray(data.documents)) {
                    return new MessageError('Invalid object.');
                }
                const item = await DatabaseServer.getPolicyLabelById(definitionId);
                if (!(item && (item.creator === owner.creator || item.status === EntityStatus.PUBLISHED))) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status !== EntityStatus.PUBLISHED) {
                    return new MessageError('Item is not published.');
                }

                const vp = await DatabaseServer.getVP({
                    id: data.target,
                    type: 'mint',
                    policyId: item.policyId,
                    owner: owner.creator,
                });
                if (!vp) {
                    return new MessageError('Target does not exist.');
                }

                const relationships = await findRelationships(vp);
                const ids = relationships.map((doc) => doc.messageId);

                const schemas = await DatabaseServer.getSchemas({ topicId: item.topicId });
                const schemaObjects = schemas.map((schema) => new Schema(schema));

                const validator = new LabelValidators(item);
                validator.setData(relationships);
                validator.setResult(data.documents);
                const status = validator.validate();

                if (!status.valid) {
                    return new MessageError('Invalid item.');
                }

                const vcs = validator.getVCs();
                const vpObject = await generateVpDocument(vcs, schemaObjects, owner);

                const topic = await getOrCreateTopic(item);
                const user = await (new Users()).getHederaAccount(owner.creator);
                const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, user.signOptions);

                const vpMessage = new LabelDocumentMessage(MessageAction.CreateLabelDocument);
                vpMessage.setDefinition(item);
                vpMessage.setDocument(vpObject);
                vpMessage.setTarget(vp.messageId);
                vpMessage.setRelationships(ids);
                const vpMessageResult = await messageServer
                    .setTopicObject(topic)
                    .sendMessage(vpMessage);

                const row = await DatabaseServer.createLabelDocument({
                    definitionId: item.id,
                    policyId: item.policyId,
                    policyTopicId: item.policyTopicId,
                    policyInstanceTopicId: item.policyInstanceTopicId,
                    creator: owner.creator,
                    owner: owner.owner,
                    messageId: vpMessageResult.getId(),
                    topicId: vpMessageResult.getTopicId(),
                    target: vpMessageResult.getTarget(),
                    relationships: vpMessageResult.getRelationships(),
                    document: vpMessageResult.getDocument()
                });
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get label document
     *
     * @param {any} msg - filters
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_POLICY_LABEL_DOCUMENTS,
        async (msg: {
            definitionId: string,
            filters: any,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, filters, owner } = msg;
                const { pageIndex, pageSize } = filters;

                const item = await DatabaseServer.getPolicyLabelById(definitionId);
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

                const [items, count] = await DatabaseServer.getLabelDocumentsAndCount(
                    {
                        definitionId
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
     * Get label document
     *
     * @param {any} msg - label id
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_POLICY_LABEL_DOCUMENT,
        async (msg: {
            definitionId: string,
            documentId: string,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, documentId, owner } = msg;
                const document = await DatabaseServer.getLabelDocument({
                    id: documentId,
                    definitionId,
                    owner: owner.owner
                });
                if (!document) {
                    return new MessageError('Item does not exist.');
                }

                return new MessageResponse(document);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
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
    ApiResponse(MessageAPI.GET_POLICY_LABEL_DOCUMENT_RELATIONSHIPS,
        async (msg: {
            definitionId: string,
            documentId: string,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { definitionId, documentId, owner } = msg;
                const document = await DatabaseServer.getLabelDocument({
                    id: documentId,
                    definitionId,
                    owner: owner.owner
                });
                if (!document) {
                    return new MessageError('Item does not exist.');
                }

                const relationships = await DatabaseServer.getStatisticDocuments({
                    messageId: { $in: document?.relationships }
                });

                const target = await DatabaseServer.getVP({
                    messageId: document?.target
                });

                return new MessageResponse({
                    target,
                    relationships
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}