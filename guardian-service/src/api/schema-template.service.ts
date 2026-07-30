import { FilterObject } from '@mikro-orm/core';
import {
    BinaryMessageResponse,
    DatabaseServer,
    MessageError,
    MessageResponse,
    MessageAction,
    MessageServer,
    MessageType,
    NewNotifier,
    PinoLogger,
    RunFunctionAsync,
    Schema,
    SchemaTemplateMessage,
    SchemaTemplateImportExport,
    SchemaTemplate,
    TopicConfig,
    TopicHelper,
    Users
} from '@guardian/common';
import { createHash } from 'node:crypto';
import {
    GenerateUUIDv4,
    IOwner,
    ISchema,
    ISchemaTemplate,
    ISchemaTemplateConfig,
    ISchemaTemplateSnapshot,
    ISchemaTemplateSnapshotField,
    ISchemaTemplateSnapshotSchema,
    ISchemaTemplateSnapshotSchemas,
    MessageAPI,
    ModuleStatus,
    PolicyStatus,
    Schema as InterfaceSchema,
    SchemaCategory,
    SchemaHelper,
    SchemaStatus,
    TopicType
} from '@guardian/interfaces';
import { ApiResponse } from './helpers/api-response.js';
import { createSchemaAndArtifacts, deleteSchema, SchemaImportExportHelper, updateSchemaDefs } from '../helpers/import-helpers/index.js';

async function createTemplateTopic(
    template: SchemaTemplate,
    owner: IOwner,
    logger: PinoLogger
): Promise<void> {
    if (template.topicId) {
        return;
    }

    const users = new Users();
    const root = await users.getHederaAccount(owner.creator, owner.id);
    const parent = await TopicConfig.fromObject(
        await DatabaseServer.getTopicByType(owner.owner, TopicType.UserTopic),
        true,
        owner.id
    );
    const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);

    await logger.info('Create schema template: create topic', ['GUARDIAN_SERVICE'], owner.id);
    const topic = await topicHelper.create(
        {
            type: TopicType.SchemaTemplateTopic,
            name: template.name || TopicType.SchemaTemplateTopic,
            description: template.description || TopicType.SchemaTemplateTopic,
            owner: owner.owner,
            targetId: template.id.toString(),
            targetUUID: template.uuid
        },
        {
            admin: true,
            submit: true
        },
        {
            userId: owner.id
        }
    );
    await topic.saveKeys(owner.id);
    template.topicId = topic.topicId;

    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    const message = new SchemaTemplateMessage(
        MessageType.SchemaTemplate,
        MessageAction.CreateSchemaTemplate
    );
    message.setDocument(template);
    const messageStatus = await messageServer
        .setTopicObject(parent)
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId: owner.id,
            interception: null
        });

    await topicHelper.twoWayLink({
        topic,
        parent,
        rationale: messageStatus.getId(),
        userId: owner.id
    });
    await DatabaseServer.saveTopic(topic.toObject());
    await DatabaseServer.updateSchemaTemplate(template);
}

async function createSchemaTemplate(
    payload: ISchemaTemplate,
    owner: IOwner,
    logger: PinoLogger
): Promise<SchemaTemplate> {
    if (!payload) {
        throw new Error('Invalid schema template');
    }

    delete payload._id;
    delete payload.id;
    delete payload.status;
    delete payload.owner;
    delete payload.creator;
    delete payload.messageId;
    delete payload.version;
    delete payload.previousVersion;

    payload.creator = owner.creator;
    payload.owner = owner.owner;
    payload.status = ModuleStatus.DRAFT;
    payload.config = payload.config || {};

    const template = await DatabaseServer.saveSchemaTemplate(payload);

    try {
        await createTemplateTopic(template, owner, logger);
        return template;
    } catch (error) {
        await DatabaseServer.removeSchemaTemplate(template);
        throw error;
    }
}

async function prepareTemplatePreviewMessage(
    messageId: string,
    owner: IOwner
): Promise<any> {
    if (!messageId) {
        throw new Error('Message ID in body is empty');
    }

    const users = new Users();
    const root = await users.getHederaAccount(owner.creator, owner.id);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    const message = await messageServer.getMessage<SchemaTemplateMessage>({
        messageId,
        loadIPFS: true,
        userId: owner.id,
        interception: null
    });

    if (!message) {
        throw new Error('Invalid Message');
    }
    if (message.type !== MessageType.SchemaTemplate) {
        throw new Error('Invalid Message Type');
    }
    if (!message.document) {
        throw new Error('file in body is empty');
    }

    const result: any = await SchemaTemplateImportExport.parseZipFile(message.document);
    result.messageId = messageId;
    result.templateTopicId = message.schemaTemplateTopicId;
    return result;
}

async function importSchemaTemplateByComponents(
    components: any,
    owner: IOwner,
    logger: PinoLogger,
    notifier: any
): Promise<SchemaTemplate> {
    const STEP_CREATE_TEMPLATE = 'Create schema template and topic';
    const STEP_IMPORT_SCHEMAS = 'Import template schemas';
    const STEP_SAVE_CONFIG = 'Save template config';

    notifier.addStep(STEP_CREATE_TEMPLATE);
    notifier.addStep(STEP_IMPORT_SCHEMAS);
    notifier.addStep(STEP_SAVE_CONFIG);
    notifier.start();

    const templatePayload = cloneJson(components.template || {});
    const schemaPayloads = cloneJson(components.schemas || []);
    templatePayload.config = templatePayload.config || {};

    notifier.startStep(STEP_CREATE_TEMPLATE);
    const template = await createSchemaTemplate(templatePayload, owner, logger);
    notifier.completeStep(STEP_CREATE_TEMPLATE);

    notifier.startStep(STEP_IMPORT_SCHEMAS);
    for (const schema of schemaPayloads) {
        schema.topicId = template.topicId;
        schema.category = SchemaCategory.TEMPLATE;
        schema.templateId = template.id;
        schema.templateSchemaId = schema.templateSchemaId || GenerateUUIDv4();
        SchemaHelper.ensureTemplateFieldIds(schema.document);
    }
    await SchemaImportExportHelper.importSchemaByFiles(
        schemaPayloads,
        owner,
        {
            category: SchemaCategory.TEMPLATE,
            topicId: template.topicId
        },
        notifier.getStep(STEP_IMPORT_SCHEMAS),
        owner.id
    );
    notifier.completeStep(STEP_IMPORT_SCHEMAS);

    notifier.startStep(STEP_SAVE_CONFIG);
    await normalizeSchemaTemplateConfig(template);
    const result = await DatabaseServer.updateSchemaTemplate(template);
    notifier.completeStep(STEP_SAVE_CONFIG);
    notifier.complete();
    return result;
}

function ensureEditable(
    template: SchemaTemplate | null,
    owner: IOwner
): asserts template is SchemaTemplate {
    if (!template || template.owner !== owner.owner) {
        throw new Error('Invalid schema template');
    }
    if (template.status === ModuleStatus.PUBLISHED) {
        throw new Error('Schema template published');
    }
}

async function addSchemaCounts(templates: SchemaTemplate[]): Promise<any[]> {
    const result = [];
    for (const template of templates) {
        const item: any = template;
        item.schemasCount = template.topicId
            ? await DatabaseServer.getSchemasCount({
                topicId: template.topicId,
                category: SchemaCategory.TEMPLATE
            })
            : 0;
        result.push(item);
    }
    return result;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cloneJson<T>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function normalizeTemplateConfigKeys(
    config: ISchemaTemplateConfig | null | undefined,
    schemas: Schema[]
): ISchemaTemplateConfig {
    const normalized = cloneJson(config || { schemas: {} });
    normalized.schemas = normalized.schemas || {};
    for (const schema of schemas || []) {
        const stableKey = schema.templateSchemaId || '';
        const dbKey = schema.id || (schema as any)?._id || '';
        if (!stableKey || !dbKey || stableKey === dbKey) {
            continue;
        }
        if (!normalized.schemas[stableKey] && normalized.schemas[dbKey]) {
            normalized.schemas[stableKey] = cloneJson(normalized.schemas[dbKey]);
        }
    }
    return normalized;
}

async function normalizeSchemaTemplateConfig(template: SchemaTemplate): Promise<void> {
    if (!template?.topicId) {
        return;
    }
    const schemas = await DatabaseServer.getSchemas({
        topicId: template.topicId,
        category: SchemaCategory.TEMPLATE
    });
    for (const schema of schemas as Schema[]) {
        await ensureTemplateSchemaReferences(schema);
    }
    template.config = normalizeTemplateConfigKeys(template.config, schemas as Schema[]);
}

function createTemplateStateHash(config: ISchemaTemplateConfig, schemas: ISchemaTemplateSnapshotSchemas): string {
    return createHash('sha256')
        .update(SchemaHelper.stableStringify({ config, schemas }))
        .digest('hex');
}

function buildTemplateSchemaIriMap(templateSchemas: Schema[]): Map<string, string> {
    const result = new Map<string, string>();
    for (const schema of templateSchemas || []) {
        if (!schema?.templateSchemaId) {
            continue;
        }
        const aliases = [
            schema.iri,
            schema.document?.$id,
            schema.uuid && schema.version ? `#${schema.uuid}&${schema.version}` : ''
        ];
        for (const alias of aliases) {
            if (alias) {
                result.set(alias, schema.templateSchemaId);
            }
        }
    }
    return result;
}

function toSnapshotField(
    field: any,
    templateSchemaByIri: Map<string, string>
): ISchemaTemplateSnapshotField {
    const snapshotField = SchemaHelper.cloneSchemaRuntimeValue(field || {});
    const refTemplateSchemaId = field?.isRef && field?.type
        ? templateSchemaByIri.get(field.type)
        : '';
    if (refTemplateSchemaId) {
        snapshotField.refTemplateSchemaId = refTemplateSchemaId;
        delete snapshotField.fields;
    }
    return snapshotField;
}

function toSnapshotSchema(
    schema: Schema,
    templateSchemaByIri: Map<string, string>
): ISchemaTemplateSnapshotSchema {
    const parsed = new InterfaceSchema(schema as ISchema, true);
    return {
        templateSchemaId: schema.templateSchemaId,
        name: schema.name,
        description: schema.description,
        entity: schema.entity,
        version: schema.version,
        fields: (parsed.fields || []).map((field) => toSnapshotField(field, templateSchemaByIri)),
        conditions: SchemaHelper.cloneSchemaRuntimeValue(parsed.conditions || [])
    };
}

function buildTemplateSchemasSnapshot(templateSchemas: Schema[]): ISchemaTemplateSnapshotSchemas {
    const schemas: Record<string, ISchemaTemplateSnapshotSchema> = {};
    const templateSchemaByIri = buildTemplateSchemaIriMap(templateSchemas);
    for (const schema of templateSchemas) {
        schemas[schema.templateSchemaId] = toSnapshotSchema(schema, templateSchemaByIri);
    }
    return { schemas };
}

async function saveApplySnapshot(
    template: SchemaTemplate,
    policy: any,
    templateSchemas: Schema[],
    schemaMap: Record<string, string>,
    appliedAt: string
) {
    const config = normalizeTemplateConfigKeys(template.config, templateSchemas);
    const schemas = buildTemplateSchemasSnapshot(templateSchemas);
    const snapshot: ISchemaTemplateSnapshot = {
        policyId: policy.id,
        policyUUID: policy.uuid,
        templateId: template.id,
        templateUUID: template.uuid,
        templateName: template.name,
        templateVersion: template.version,
        templateStatus: template.status,
        templateMessageId: template.messageId,
        templateStateHash: createTemplateStateHash(config, schemas),
        appliedAt,
        schemaMap,
        config,
        schemas
    };
    return await DatabaseServer.saveSchemaTemplateSnapshot(snapshot);
}

async function ensureTemplateSchemaReferences(schema: Schema): Promise<void> {
    let changed = false;
    if (!schema.templateSchemaId) {
        schema.templateSchemaId = GenerateUUIDv4();
        changed = true;
    }
    changed = SchemaHelper.ensureTemplateFieldIds(schema.document) || changed;
    if (changed) {
        await DatabaseServer.updateSchema(schema.id, schema);
    }
}

function preparePolicySchemaCopy(
    source: Schema,
    policyTopicId: string,
    templateId: string
): ISchema {
    const copy: any = JSON.parse(JSON.stringify(source));
    delete copy._id;
    delete copy.id;
    delete copy.uuid;
    delete copy.hash;
    delete copy.status;
    delete copy.messageId;
    delete copy.documentURL;
    delete copy.documentFileId;
    delete copy.contextURL;
    delete copy.contextFileId;
    delete copy.contentDocumentFileId;
    delete copy.contentContextFileId;
    delete copy.createDate;
    delete copy.updateDate;
    delete copy.topicCount;
    delete copy.defs;
    delete copy.errors;

    copy.uuid = GenerateUUIDv4();
    copy.contextURL = `schema:${copy.uuid}`;
    copy.topicId = policyTopicId;
    copy.category = SchemaCategory.POLICY;
    copy.templateId = templateId;
    copy.templateSchemaId = source.templateSchemaId;
    copy.readonly = false;
    copy.system = false;
    return copy;
}

async function updateCopiedSchemaRefs(
    copiedSchemas: Schema[],
    iriMap: Map<string, string>
): Promise<void> {
    for (const schema of copiedSchemas) {
        if (!schema.document) {
            continue;
        }
        let document = JSON.stringify(schema.document);
        for (const [oldIri, newIri] of iriMap.entries()) {
            document = document.replaceAll(oldIri.substring(1), newIri.substring(1));
        }
        schema.document = JSON.parse(document);
        await DatabaseServer.updateSchema(schema.id, schema);
        await updateSchemaDefs(schema.iri);
    }
}

async function applySchemaTemplate(
    templateId: string,
    policyId: string,
    owner: IOwner
): Promise<any> {
    const template = await DatabaseServer.getSchemaTemplateById(templateId);
    if (!template || (template.status !== ModuleStatus.PUBLISHED && template.owner !== owner.owner)) {
        throw new Error('Invalid schema template');
    }
    if (!template.topicId) {
        throw new Error('Schema template has no topic');
    }

    const policy = await DatabaseServer.getPolicyById(policyId);
    if (!policy || policy.owner !== owner.owner) {
        throw new Error('Invalid policy');
    }
    if (policy.status !== PolicyStatus.DRAFT) {
        throw new Error('Policy is not in draft status');
    }
    if (!policy.topicId) {
        throw new Error('Policy has no topic');
    }
    if (policy.schemaTemplate?.templateId) {
        throw new Error('Schema template already applied to policy');
    }

    const templateSchemas = await DatabaseServer.getSchemas({
        topicId: template.topicId,
        category: SchemaCategory.TEMPLATE
    });
    if (!templateSchemas.length) {
        throw new Error('Schema template has no schemas');
    }

    for (const schema of templateSchemas as Schema[]) {
        await ensureTemplateSchemaReferences(schema);
    }

    const schemaMap: Record<string, string> = {};
    const iriMap = new Map<string, string>();
    const copiedSchemas: Schema[] = [];

    for (const schema of templateSchemas as Schema[]) {
        const sourceIri = schema.iri;
        const copy = preparePolicySchemaCopy(schema, policy.topicId, template.id);
        const copied = await createSchemaAndArtifacts(
            SchemaCategory.POLICY,
            copy,
            owner,
            NewNotifier.empty()
        );
        schemaMap[schema.templateSchemaId] = copied.id;
        if (sourceIri && copied.iri) {
            iriMap.set(sourceIri, copied.iri);
        }
        copiedSchemas.push(copied);
    }

    await updateCopiedSchemaRefs(copiedSchemas, iriMap);

    const appliedAt = new Date().toISOString();
    const snapshot = await saveApplySnapshot(
        template,
        policy,
        templateSchemas as Schema[],
        schemaMap,
        appliedAt
    );

    policy.schemaTemplate = {
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version,
        templateStatus: template.status,
        templateMessageId: template.messageId,
        templateStateHash: snapshot.templateStateHash,
        snapshotId: snapshot.id,
        appliedAt,
        schemaMap
    };
    try {
        return await DatabaseServer.updatePolicy(policy);
    } catch (error) {
        await DatabaseServer.removeSchemaTemplateSnapshot(snapshot);
        throw error;
    }
}

async function detachSchemaTemplate(
    policyId: string,
    owner: IOwner
): Promise<any> {
    const policy = await DatabaseServer.getPolicyById(policyId);
    if (!policy || policy.owner !== owner.owner) {
        throw new Error('Invalid policy');
    }
    if (policy.status !== PolicyStatus.DRAFT) {
        throw new Error('Policy is not in draft status');
    }
    if (!policy.topicId) {
        throw new Error('Policy has no topic');
    }
    if (!policy.schemaTemplate?.templateId) {
        throw new Error('Schema template is not applied to policy');
    }

    const binding = policy.schemaTemplate;
    const schemaIds = new Set(Object.values(binding.schemaMap || {}).filter(id => !!id).map(id => String(id)));
    let detachedSchemas = 0;
    const schemas = await DatabaseServer.getSchemas({
        topicId: policy.topicId,
        category: SchemaCategory.POLICY
    });

    for (const schema of schemas as Schema[]) {
        const schemaId = String(schema.id || (schema as any)?._id || '');
        const isBoundSchema = schemaIds.has(schemaId) || schema.templateId === binding.templateId;
        if (!isBoundSchema) {
            continue;
        }
        schema.templateId = '';
        schema.templateSchemaId = '';
        SchemaHelper.removeTemplateFieldIds(schema.document);
        await DatabaseServer.updateSchema(schema.id, schema);
        detachedSchemas++;
    }

    if (binding.snapshotId) {
        const snapshot = await DatabaseServer.getSchemaTemplateSnapshotById(binding.snapshotId);
        if (snapshot) {
            await DatabaseServer.removeSchemaTemplateSnapshot(snapshot);
        }
    }

    policy.schemaTemplate = null;
    await DatabaseServer.updatePolicy(policy);
    return {
        policyId: policy.id,
        templateId: binding.templateId,
        detachedSchemas
    };
}

async function getAppliedSchemaTemplateByPolicyTopic(
    topicId: string,
    owner: IOwner
): Promise<any | null> {
    const policy = await DatabaseServer.getPolicy({ topicId });
    if (!policy || policy.owner !== owner.owner) {
        throw new Error('Invalid policy');
    }

    const binding = policy.schemaTemplate;
    if (!binding?.templateId) {
        return null;
    }

    const template = await DatabaseServer.getSchemaTemplateById(binding.templateId);
    let config: ISchemaTemplateConfig | null | undefined;
    if (binding.snapshotId) {
        const snapshot = await DatabaseServer.getSchemaTemplateSnapshotById(binding.snapshotId);
        config = snapshot?.config;
    }
    if (!config) {
        config = template?.config;
    }

    return {
        id: binding.templateId,
        _id: binding.templateId,
        uuid: template?.uuid,
        name: binding.templateName || template?.name,
        description: template?.description,
        owner: template?.owner || owner.owner,
        creator: template?.creator,
        status: binding.templateStatus || template?.status,
        version: binding.templateVersion || template?.version,
        topicId: template?.topicId,
        messageId: binding.templateMessageId || template?.messageId,
        config: config || { schemas: {} },
        snapshotId: binding.snapshotId,
        templateStateHash: binding.templateStateHash,
        appliedAt: binding.appliedAt
    };
}

/**
 * Connect to the message broker methods of working with schema templates.
 */
export async function schemaTemplatesAPI(logger: PinoLogger): Promise<void> {
    ApiResponse(MessageAPI.CREATE_SCHEMA_TEMPLATE,
        async (msg: {
            template: ISchemaTemplate,
            owner: IOwner
        }) => {
            try {
                const { template, owner } = msg;
                const item = await createSchemaTemplate(template, owner, logger);
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_SCHEMA_TEMPLATES,
        async (msg: {
            filters: any,
            owner: IOwner
        }) => {
            try {
                const { filters, owner } = msg;
                const pageSize = parseInt(filters?.pageSize, 10);
                const pageIndex = parseInt(filters?.pageIndex, 10);
                const options: any = {
                    orderBy: { createDate: 'DESC' },
                    fields: [
                        'id',
                        'uuid',
                        'name',
                        'description',
                        'owner',
                        'creator',
                        'status',
                        'version',
                        'previousVersion',
                        'topicId',
                        'messageId'
                    ]
                };
                if (Number.isInteger(pageSize) && Number.isInteger(pageIndex)) {
                    options.limit = pageSize;
                    options.offset = pageIndex * pageSize;
                } else {
                    options.limit = 100;
                }

                const search = String(filters?.search || '').trim();
                const visibilityFilter: any = {
                    $or: [
                        { owner: owner.owner },
                        { status: ModuleStatus.PUBLISHED }
                    ]
                };
                const templateFilter: any = search
                    ? {
                        $and: [
                            visibilityFilter,
                            {
                                name: {
                                    $re: new RegExp(escapeRegExp(search), 'i')
                                }
                            }
                        ]
                    }
                    : visibilityFilter;

                const [items, count] = await DatabaseServer.getSchemaTemplatesAndCount({
                    ...templateFilter
                }, options);

                return new MessageResponse({
                    items: await addSchemaCounts(items),
                    count
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_SCHEMA_TEMPLATE,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                const template = await DatabaseServer.getSchemaTemplateById(id);
                if (!template) {
                    throw new Error('Invalid schema template');
                }
                if (template.status !== ModuleStatus.PUBLISHED && template.owner !== owner.owner) {
                    throw new Error('Invalid schema template');
                }
                await normalizeSchemaTemplateConfig(template);
                return new MessageResponse(template);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_APPLIED_SCHEMA_TEMPLATE,
        async (msg: {
            topicId: string,
            owner: IOwner
        }) => {
            try {
                const { topicId, owner } = msg;
                const result = await getAppliedSchemaTemplateByPolicyTopic(topicId, owner);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.CHECK_SCHEMA_TEMPLATE,
        async (msg: {
            messageId: string,
            owner: IOwner
        }) => {
            try {
                const { messageId, owner } = msg;
                if (!messageId) {
                    return new MessageResponse({ status: 'not-found' });
                }
                const template = await DatabaseServer.getSchemaTemplate({
                    messageId,
                    status: ModuleStatus.PUBLISHED
                });
                if (template) {
                    return new MessageResponse({
                        status: 'local',
                        template: {
                            id: template.id,
                            name: template.name,
                            version: template.version,
                            messageId: template.messageId,
                            status: template.status
                        }
                    });
                }
                const preview = await prepareTemplatePreviewMessage(messageId, owner);
                return new MessageResponse({
                    status: 'network',
                    template: {
                        name: preview?.template?.name,
                        version: preview?.template?.version,
                        messageId,
                        topicId: preview?.templateTopicId
                    }
                });
            } catch (error) {
                return new MessageResponse({ status: 'not-found' });
            }
        });

    ApiResponse(MessageAPI.SCHEMA_TEMPLATE_EXPORT_FILE,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                if (!id || !owner) {
                    return new MessageError('Invalid schema template parameter');
                }
                const template = await DatabaseServer.getSchemaTemplateById(id);
                if (!template) {
                    throw new Error('Invalid schema template');
                }
                if (template.status !== ModuleStatus.PUBLISHED && template.owner !== owner.owner) {
                    throw new Error('Invalid schema template');
                }
                if (template.status === ModuleStatus.PUBLISHED && template.contentFileId) {
                    const buffer = await DatabaseServer.loadFile(template.contentFileId);
                    return new BinaryMessageResponse(Uint8Array.from(buffer).buffer);
                }

                await normalizeSchemaTemplateConfig(template);
                const zip = await SchemaTemplateImportExport.generate(template);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3
                    },
                    platform: 'UNIX'
                });
                return new BinaryMessageResponse(file);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SCHEMA_TEMPLATE_EXPORT_MESSAGE,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                const template = await DatabaseServer.getSchemaTemplateById(id);
                if (!template) {
                    throw new Error('Invalid schema template');
                }
                if (template.status !== ModuleStatus.PUBLISHED && template.owner !== owner.owner) {
                    throw new Error('Invalid schema template');
                }
                return new MessageResponse({
                    id: template.id,
                    uuid: template.uuid,
                    name: template.name,
                    description: template.description,
                    messageId: template.messageId,
                    owner: template.owner,
                    version: template.version
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SCHEMA_TEMPLATE_IMPORT_FILE_PREVIEW,
        async (msg: {
            zip: any,
            owner: IOwner
        }) => {
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await SchemaTemplateImportExport.parseZipFile(Buffer.from(zip.data));
                return new MessageResponse(preview);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SCHEMA_TEMPLATE_IMPORT_MESSAGE_PREVIEW,
        async (msg: {
            messageId: string,
            owner: IOwner
        }) => {
            try {
                const { messageId, owner } = msg;
                const preview = await prepareTemplatePreviewMessage(messageId, owner);
                return new MessageResponse(preview);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SCHEMA_TEMPLATE_IMPORT_FILE_ASYNC,
        async (msg: {
            zip: any,
            owner: IOwner,
            task: any
        }) => {
            const { zip, owner, task } = msg;
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(async () => {
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await SchemaTemplateImportExport.parseZipFile(Buffer.from(zip.data));
                const template = await importSchemaTemplateByComponents(preview, owner, logger, notifier);
                notifier.result({
                    templateId: template.id,
                    errors: []
                });
            }, async (error) => {
                notifier.fail(error);
            });
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.SCHEMA_TEMPLATE_IMPORT_MESSAGE_ASYNC,
        async (msg: {
            messageId: string,
            owner: IOwner,
            task: any
        }) => {
            const { messageId, owner, task } = msg;
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(async () => {
                const preview = await prepareTemplatePreviewMessage(messageId, owner);
                const template = await importSchemaTemplateByComponents(preview, owner, logger, notifier);
                notifier.result({
                    templateId: template.id,
                    errors: []
                });
            }, async (error) => {
                notifier.fail(error);
            });
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.UPDATE_SCHEMA_TEMPLATE,
        async (msg: {
            id: string,
            template: ISchemaTemplate,
            owner: IOwner
        }) => {
            try {
                const { id, template, owner } = msg;
                const item = await DatabaseServer.getSchemaTemplateById(id);
                ensureEditable(item, owner);

                item.name = template.name;
                item.description = template.description;
                item.config = template.config || {};
                item.version = template.version;
                item.previousVersion = template.previousVersion;

                const result = await DatabaseServer.updateSchemaTemplate(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DELETE_SCHEMA_TEMPLATE,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                const template = await DatabaseServer.getSchemaTemplateById(id);
                ensureEditable(template, owner);

                if (template.topicId) {
                    const schemas = await DatabaseServer.getSchemas({
                        topicId: template.topicId,
                        category: SchemaCategory.TEMPLATE,
                        readonly: false
                    });
                    for (const schema of schemas as Schema[]) {
                        if (schema.status === SchemaStatus.DRAFT || schema.status === SchemaStatus.ERROR) {
                            await deleteSchema(schema.id, owner, NewNotifier.empty());
                        }
                    }
                }

                await DatabaseServer.removeSchemaTemplate(template);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.APPLY_SCHEMA_TEMPLATE,
        async (msg: {
            templateId: string,
            policyId: string,
            owner: IOwner
        }) => {
            try {
                const { templateId, policyId, owner } = msg;
                const result = await applySchemaTemplate(templateId, policyId, owner);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DETACH_SCHEMA_TEMPLATE,
        async (msg: {
            policyId: string,
            owner: IOwner
        }) => {
            try {
                const { policyId, owner } = msg;
                const result = await detachSchemaTemplate(policyId, owner);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });
}
