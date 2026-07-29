import { FilterObject } from '@mikro-orm/core';
import {
    DatabaseServer,
    MessageError,
    MessageResponse,
    NewNotifier,
    PinoLogger,
    Schema,
    SchemaTemplate,
    TopicConfig,
    TopicHelper,
    Users
} from '@guardian/common';
import { GenerateUUIDv4, IOwner, ISchema, ISchemaTemplate, MessageAPI, ModuleStatus, PolicyStatus, SchemaCategory, SchemaStatus, TopicType } from '@guardian/interfaces';
import { ApiResponse } from './helpers/api-response.js';
import { createSchemaAndArtifacts, deleteSchema, updateSchemaDefs } from '../helpers/import-helpers/index.js';

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
    await topicHelper.twoWayLink({
        topic,
        parent,
        rationale: null,
        userId: owner.id
    });
    await DatabaseServer.saveTopic(topic.toObject());

    template.topicId = topic.topicId;
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

function walkSchemaProperties(document: any, visitor: (property: any) => void): void {
    if (!document || typeof document !== 'object') {
        return;
    }
    const properties = document.properties;
    if (properties && typeof properties === 'object') {
        for (const property of Object.values<any>(properties)) {
            visitor(property);
            const target = property?.type === 'array' ? property.items : property;
            walkSchemaProperties(target, visitor);
        }
    }
}

async function ensureTemplateSchemaLineage(schema: Schema): Promise<void> {
    let changed = false;
    if (!schema.templateSchemaId) {
        schema.templateSchemaId = GenerateUUIDv4();
        changed = true;
    }
    walkSchemaProperties(schema.document, (property) => {
        if (!property.templateFieldId) {
            property.templateFieldId = GenerateUUIDv4();
            changed = true;
        }
    });
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
        await ensureTemplateSchemaLineage(schema);
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

    policy.schemaTemplate = {
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version,
        templateStatus: template.status,
        templateMessageId: template.messageId,
        appliedAt: new Date().toISOString(),
        schemaMap
    };
    return await DatabaseServer.updatePolicy(policy);
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
                return new MessageResponse(template);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
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
}
