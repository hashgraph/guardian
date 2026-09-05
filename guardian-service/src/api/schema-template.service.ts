import { FilterObject } from '@mikro-orm/core';
import {
    BinaryMessageResponse,
    DataBaseHelper,
    DatabaseServer,
    INotificationStep,
    MessageError,
    MessageResponse,
    MessageAction,
    MessageServer,
    MessageType,
    NewNotifier,
    PinoLogger,
    Policy,
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
    IPolicySchemaTemplateBinding,
    ISchemaTemplateConfig,
    ISchemaTemplateSnapshot,
    ISchemaTemplateSnapshotField,
    ISchemaTemplateSnapshotSchema,
    ISchemaTemplateSnapshotSchemas,
    ISchemaTemplateUpdateChange,
    ISchemaTemplateUpdateConflict,
    ISchemaTemplateUpdateOptions,
    ISchemaTemplateUpdatePreview,
    SchemaTemplateUpdateChangeType,
    SchemaTemplateUpdateConflictType,
    SchemaTemplateUpdateResolutionAction,
    MessageAPI,
    ModelHelper,
    ModuleStatus,
    PolicyStatus,
    Schema as InterfaceSchema,
    SchemaCategory,
    SchemaHelper,
    SchemaStatus,
    TopicType
} from '@guardian/interfaces';
import { ApiResponse } from './helpers/api-response.js';
import { withPolicyTemplateLock } from '../helpers/policy-template-lock.js';
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

    /*
     * A legitimate export never carries these, so a hand-crafted zip is the only
     * source. Two are dangerous rather than untidy:
     *  - contentFileId / configFileId reach gridFS.delete() via deleteFiles(),
     *    so a forged value deletes someone else's file.
     *  - topicId makes createTemplateTopic() return early, binding the import to
     *    an existing topic; a later publish then signs with that topic's key.
     */
    delete payload._id;
    delete payload.id;
    delete payload.status;
    delete payload.owner;
    delete payload.creator;
    delete payload.messageId;
    delete payload.version;
    delete payload.previousVersion;
    delete payload.topicId;
    delete (payload as any).contentFileId;
    delete (payload as any).configFileId;
    delete (payload as any)._configFileId;
    // setDefaults() only generates a uuid when missing, so a forged one would be
    // kept and propagate into targetUUID / templateUUID.
    delete payload.uuid;

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

function prepareTemplateSchemaVersionCopy(
    source: Schema,
    template: SchemaTemplate
): ISchema {
    const copy: any = JSON.parse(JSON.stringify(source));
    delete copy._id;
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

    copy.topicId = template.topicId;
    copy.category = SchemaCategory.TEMPLATE;
    copy.templateId = template.id;
    copy.templateSchemaId = source.templateSchemaId;
    copy.readonly = false;
    copy.system = false;
    return copy;
}

async function createSchemaTemplateVersion(
    id: string,
    owner: IOwner,
    logger: PinoLogger,
    notifier: INotificationStep
): Promise<SchemaTemplate> {
    const STEP_VALIDATE = 'Find and validate schema template';
    const STEP_CREATE_TEMPLATE = 'Create draft template version';
    const STEP_COPY_SCHEMAS = 'Copy template schemas';
    const STEP_UPDATE_REFS = 'Update schema references';
    const STEP_SAVE_CONFIG = 'Save template config';

    notifier.addStep(STEP_VALIDATE);
    notifier.addStep(STEP_CREATE_TEMPLATE);
    notifier.addStep(STEP_COPY_SCHEMAS);
    notifier.addStep(STEP_UPDATE_REFS);
    notifier.addStep(STEP_SAVE_CONFIG);
    notifier.start();

    let draft: SchemaTemplate | null = null;
    try {
        notifier.startStep(STEP_VALIDATE);
        const source = await DatabaseServer.getSchemaTemplateById(id);
        if (!source || source.owner !== owner.owner) {
            throw new Error('Invalid schema template');
        }
        if (source.status !== ModuleStatus.PUBLISHED) {
            throw new Error('Schema template is not published');
        }
        if (!source.topicId) {
            throw new Error('Schema template has no topic');
        }
        const existingDraft = await DatabaseServer.getSchemaTemplate({
            topicId: source.topicId,
            status: ModuleStatus.DRAFT,
            owner: owner.owner
        });
        if (existingDraft) {
            throw new Error('Draft schema template version already exists');
        }
        const sourceSchemas = await DatabaseServer.getSchemas({
            topicId: source.topicId,
            category: SchemaCategory.TEMPLATE,
            templateId: source.id,
            readonly: false
        });
        for (const schema of sourceSchemas as Schema[]) {
            await ensureTemplateSchemaReferences(schema, true);
        }
        notifier.completeStep(STEP_VALIDATE);

        notifier.startStep(STEP_CREATE_TEMPLATE);
        const templatePayload: ISchemaTemplate = {
            uuid: source.uuid,
            name: source.name,
            description: source.description,
            creator: owner.creator,
            owner: owner.owner,
            status: ModuleStatus.DRAFT,
            previousVersion: source.version,
            topicId: source.topicId,
            config: cloneJson(source.config || {})
        };
        draft = await DatabaseServer.saveSchemaTemplate(templatePayload);
        notifier.completeStep(STEP_CREATE_TEMPLATE);

        notifier.startStep(STEP_COPY_SCHEMAS);
        const iriMap = new Map<string, string>();
        const copiedSchemas: Schema[] = [];
        for (const schema of sourceSchemas as Schema[]) {
            const copy = prepareTemplateSchemaVersionCopy(schema, draft);
            const saved = await createSchemaAndArtifacts(
                SchemaCategory.TEMPLATE,
                copy,
                owner,
                NewNotifier.empty()
            );
            iriMap.set(schema.iri, saved.iri);
            copiedSchemas.push(saved);
        }
        notifier.completeStep(STEP_COPY_SCHEMAS);

        notifier.startStep(STEP_UPDATE_REFS);
        await updateCopiedSchemaRefs(copiedSchemas, iriMap);
        notifier.completeStep(STEP_UPDATE_REFS);

        notifier.startStep(STEP_SAVE_CONFIG);
        await normalizeSchemaTemplateConfig(draft, true);
        const result = await DatabaseServer.updateSchemaTemplate(draft);
        notifier.completeStep(STEP_SAVE_CONFIG);
        notifier.complete();
        return result;
    } catch (error) {
        if (draft) {
            const schemas = await DatabaseServer.getSchemas({
                topicId: draft.topicId,
                category: SchemaCategory.TEMPLATE,
                templateId: draft.id,
                readonly: false
            });
            for (const schema of schemas as Schema[]) {
                await deleteSchema(schema.id, owner, NewNotifier.empty());
            }
            await DatabaseServer.removeSchemaTemplate(draft);
        }
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

    if (message.type !== MessageType.SchemaTemplate) {
        throw new Error('Invalid Message Type');
    }
    if (message.action !== MessageAction.PublishSchemaTemplate) {
        throw new Error('Invalid Message Action');
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
    await normalizeSchemaTemplateConfig(template, true);
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

/**
 * The policy's binding for one specific template. A policy can hold several, so
 * every template operation has to find its own rather than take the first.
 */
function findSchemaTemplateBinding(
    policy: any,
    templateId: any
): IPolicySchemaTemplateBinding | undefined {
    return (policy?.schemaTemplates || []).find((binding: any) =>
        binding?.templateId === templateId || binding?.templateId === templateId?.toString()
    );
}

function policyUsesTemplate(policy: any, templateId: any): boolean {
    return !!findSchemaTemplateBinding(policy, templateId);
}

async function getPoliciesUsingSchemaTemplate(
    template: SchemaTemplate,
    owner: string
): Promise<any[]> {
    const policies = await DatabaseServer.getPolicies(
        { owner },
        { fields: ['id', 'name', 'schemaTemplates'] } as any
    );
    return (policies as any[]).filter((policy) => policyUsesTemplate(policy, template.id));
}

/**
 * `owner` gates usedByPolicyNames: the names come from the template owner's
 * policies, drafts included. The count stays public - it says how widely a
 * template is used without naming anything.
 */
async function addSchemaCounts(templates: SchemaTemplate[], owner: IOwner): Promise<any[]> {
    const ownerPoliciesCache = new Map<string, any[]>();
    const getCachedPolicies = async (ownerId: string) => {
        if (!ownerPoliciesCache.has(ownerId)) {
            const policies = await DatabaseServer.getPolicies(
                { owner: ownerId },
                { fields: ['id', 'name', 'schemaTemplates'] } as any
            );
            ownerPoliciesCache.set(ownerId, policies as any[]);
        }
        return ownerPoliciesCache.get(ownerId)!;
    };

    const result = [];
    for (const template of templates) {
        const item: any = template;
        const allPolicies = template.owner ? await getCachedPolicies(template.owner) : [];
        const usedByPolicies = allPolicies.filter((policy) => policyUsesTemplate(policy, template.id));
        item.schemasCount = template.topicId
            ? await DatabaseServer.getSchemasCount({
                topicId: template.topicId,
                category: SchemaCategory.TEMPLATE,
                templateId: template.id
            })
            : 0;
        item.usedByPoliciesCount = usedByPolicies.length;
        item.usedByPolicyNames = owner && template.owner === owner.owner
            ? usedByPolicies
                .map((policy) => policy.name || policy.id)
                .filter((name) => !!name)
                .slice(0, 5)
            : [];
        result.push(item);
    }
    return result;
}

async function publishSchemaTemplate(
    id: string,
    version: string,
    owner: IOwner,
    notifier: INotificationStep,
    logger: PinoLogger
): Promise<SchemaTemplate> {
    const STEP_VALIDATE = 'Find and validate schema template';
    const STEP_GENERATE_FILE = 'Generate schema template package';
    const STEP_SAVE_FILE = 'Save package in database';
    const STEP_PUBLISH = 'Publish schema template';
    const STEP_SAVE = 'Save template status';

    notifier.addStep(STEP_VALIDATE);
    notifier.addStep(STEP_GENERATE_FILE);
    notifier.addStep(STEP_SAVE_FILE);
    notifier.addStep(STEP_PUBLISH);
    notifier.addStep(STEP_SAVE);
    notifier.start();

    let template: SchemaTemplate | null = null;
    let validationPassed = false;
    try {
        notifier.startStep(STEP_VALIDATE);
        template = await DatabaseServer.getSchemaTemplateById(id);
        if (!template || template.owner !== owner.owner) {
            throw new Error('Invalid schema template');
        }
        if (template.status === ModuleStatus.PUBLISHED) {
            throw new Error('Schema template already published');
        }
        if (!ModelHelper.checkVersionFormat(version)) {
            throw new Error('Invalid version format');
        }
        if (!template.topicId) {
            await createTemplateTopic(template, owner, logger);
        }
        const publishedTemplates = await DatabaseServer.getSchemaTemplates({
            topicId: template.topicId,
            owner: owner.owner,
            status: ModuleStatus.PUBLISHED
        });
        const lastPublishedVersion = (publishedTemplates as SchemaTemplate[])
            .filter((item) => item.id !== template.id && !!item.version)
            .map((item) => item.version as string)
            .sort((left, right) => ModelHelper.versionCompare(right, left))[0];
        const previousVersion = template.previousVersion || template.version || lastPublishedVersion;
        template.previousVersion = previousVersion;
        if (previousVersion && ModelHelper.versionCompare(version, previousVersion) <= 0) {
            throw new Error('Version must be greater than ' + previousVersion);
        }
        const sameVersionTemplates = await DatabaseServer.getSchemaTemplates({
            topicId: template.topicId,
            version,
            owner: owner.owner
        });
        if ((sameVersionTemplates as SchemaTemplate[])
            ?.some((item) => item.id !== template.id)) {
            throw new Error('Schema template with current version already was published');
        }
        await normalizeSchemaTemplateConfig(template, true);
        notifier.completeStep(STEP_VALIDATE);
        validationPassed = true;

        notifier.startStep(STEP_GENERATE_FILE);
        template.version = version;
        const zip = await SchemaTemplateImportExport.generate(template);
        const buffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 3
            },
            platform: 'UNIX'
        });
        notifier.completeStep(STEP_GENERATE_FILE);

        notifier.startStep(STEP_SAVE_FILE);
        /*
         * contentFileId has no _configFileId-style previous-handle mechanism, so each
         * publish overwrote the handle and stranded the old file. Deleted after the new
         * one is stored, best-effort: losing it must not fail a publish.
         */
        const supersededContentFileId = template.contentFileId;
        template.contentFileId = await DatabaseServer.saveFile(GenerateUUIDv4(), Buffer.from(buffer));
        if (supersededContentFileId) {
            try {
                await DataBaseHelper.gridFS.delete(supersededContentFileId);
            } catch (error) {
                await logger?.error?.(error, ['GUARDIAN_SERVICE'], owner?.id);
            }
        }
        notifier.completeStep(STEP_SAVE_FILE);

        notifier.startStep(STEP_PUBLISH);
        const users = new Users();
        const root = await users.getHederaAccount(owner.creator, owner.id);
        const topic = await TopicConfig.fromObject(
            await DatabaseServer.getTopicById(template.topicId),
            true,
            owner.id
        );
        const messageServer = new MessageServer({
            operatorId: root.hederaAccountId,
            operatorKey: root.hederaAccountKey,
            signOptions: root.signOptions
        }).setTopicObject(topic);
        const message = new SchemaTemplateMessage(
            MessageType.SchemaTemplate,
            MessageAction.PublishSchemaTemplate
        );
        message.setDocument(template, buffer);
        const messageStatus = await messageServer.sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId: owner.id,
            interception: owner.id
        });
        notifier.completeStep(STEP_PUBLISH);

        notifier.startStep(STEP_SAVE);
        template.messageId = messageStatus.getId();
        template.status = ModuleStatus.PUBLISHED;
        const schemas = await DatabaseServer.getSchemas({
            topicId: template.topicId,
            category: SchemaCategory.TEMPLATE,
            templateId: template.id,
            readonly: false
        });
        for (const schema of schemas as Schema[]) {
            schema.status = SchemaStatus.PUBLISHED;
        }
        await DatabaseServer.updateSchemas(schemas as Schema[]);
        const result = await DatabaseServer.updateSchemaTemplate(template);
        notifier.completeStep(STEP_SAVE);
        notifier.complete();
        return result;
    } catch (error) {
        if (template && validationPassed) {
            template.status = ModuleStatus.PUBLISH_ERROR;
            await DatabaseServer.updateSchemaTemplate(template);
        }
        throw error;
    }
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
        delete normalized.schemas[dbKey];
    }
    return normalized;
}

async function normalizeSchemaTemplateConfig(
    template: SchemaTemplate,
    persist: boolean = false
): Promise<void> {
    if (!template?.topicId) {
        return;
    }
    const schemas = await DatabaseServer.getSchemas({
        topicId: template.topicId,
        category: SchemaCategory.TEMPLATE,
        templateId: template.id
    });
    for (const schema of schemas as Schema[]) {
        await ensureTemplateSchemaReferences(schema, persist);
    }
    template.config = normalizeTemplateConfigKeys(template.config, schemas as Schema[]);
}

export function createTemplateStateHash(config: ISchemaTemplateConfig, schemas: ISchemaTemplateSnapshotSchemas): string {
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

/*
 * `@context`/`type`/`id` are the fixed VC envelope Guardian always generates for a
 * VC-entity schema, not template-authored content. `includeSystemProperties: true`
 * below is needed to catch other readOnly/locked fields, but it also pulls these
 * three in - and unlike real fields, their `templateFieldId` bookkeeping is not
 * guaranteed to stay in sync with the live template between an apply and a later
 * preview, which showed up as a spurious "removed" diff a user could never actually
 * resolve (re-applying does not touch them - they are regenerated unconditionally).
 * Excluding them by name keeps the diff to fields a template author can actually add,
 * change, or remove.
 */
const SYSTEM_ENVELOPE_FIELD_NAMES = new Set(['@context', 'type', 'id']);

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
        fields: (parsed.fields || [])
            .filter((field) => !SYSTEM_ENVELOPE_FIELD_NAMES.has(field?.name))
            .map((field) => toSnapshotField(field, templateSchemaByIri)),
        conditions: SchemaHelper.cloneSchemaRuntimeValue(parsed.conditions || [])
    };
}

export function buildTemplateSchemasSnapshot(templateSchemas: Schema[]): ISchemaTemplateSnapshotSchemas {
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

function createChange(
    type: SchemaTemplateUpdateChangeType,
    message: string,
    data: Partial<ISchemaTemplateUpdateChange> = {}
): ISchemaTemplateUpdateChange {
    return {
        type,
        message,
        ...data
    };
}

function createConflict(
    type: SchemaTemplateUpdateConflictType,
    message: string,
    data: Partial<ISchemaTemplateUpdateConflict> = {}
): ISchemaTemplateUpdateConflict {
    const id = [
        type,
        data.templateSchemaId || '',
        data.templateFieldId || '',
        data.fieldName || ''
    ].join(':');
    return {
        id,
        type,
        message,
        allowedActions: [],
        ...data
    };
}

function getSnapshotSchemaConfig(
    config: ISchemaTemplateConfig | null | undefined,
    templateSchemaId: string
) {
    return config?.schemas?.[templateSchemaId] || {};
}

function fieldsByTemplateId(fields: (ISchemaTemplateSnapshotField | any)[]): Map<string, any> {
    const result = new Map<string, any>();
    for (const field of fields || []) {
        if (field?.templateFieldId) {
            result.set(String(field.templateFieldId), field);
        }
    }
    return result;
}

function customFields(fields: (ISchemaTemplateSnapshotField | any)[]): any[] {
    return (fields || []).filter((field) => !field?.templateFieldId);
}

function flattenRuntimeFields(fields: any[], result: any[] = []): any[] {
    for (const field of fields || []) {
        result.push(field);
        if (Array.isArray(field.fields)) {
            flattenRuntimeFields(field.fields, result);
        }
    }
    return result;
}

function getRuntimeCustomFields(schema: Schema): any[] {
    const parsed = new InterfaceSchema(schema as ISchema, true);
    return flattenRuntimeFields(parsed.fields || []).filter((field) => !field?.templateFieldId);
}

function parseFieldComment(comment: any): any {
    if (!comment) {
        return undefined;
    }
    if (typeof comment === 'object') {
        return SchemaHelper.cloneSchemaRuntimeValue(comment);
    }
    if (typeof comment !== 'string') {
        return comment;
    }
    try {
        return JSON.parse(comment);
    } catch {
        return comment;
    }
}

function normalizeFieldCommentForDiff(comment: any, refTemplateSchemaId?: string): any {
    const parsed = parseFieldComment(comment);
    if (!parsed || typeof parsed !== 'object') {
        return parsed;
    }
    const result = SchemaHelper.cloneSchemaRuntimeValue(parsed);
    if (refTemplateSchemaId && result['@id']) {
        result['@id'] = `template-schema:${refTemplateSchemaId}`;
    }
    return result;
}

export function normalizeFieldForDiff(field: any): any {
    const result = SchemaHelper.cloneSchemaRuntimeValue(field || {});
    const refTemplateSchemaId = result.refTemplateSchemaId || '';
    const comment = normalizeFieldCommentForDiff(result.comment ?? result.$comment, refTemplateSchemaId);
    if (comment !== undefined) {
        result.comment = comment;
    }
    delete result.$comment;
    if (refTemplateSchemaId) {
        result.$ref = `template-schema:${refTemplateSchemaId}`;
        result.type = 'subSchema';
        delete result.context;
        delete result.fields;
    }
    return result;
}

function fieldHash(field: any): string {
    return SchemaHelper.stableStringify(normalizeFieldForDiff(field));
}

function snapshotSchemaHash(schema: ISchemaTemplateSnapshotSchema | undefined): string {
    return SchemaHelper.stableStringify({
        name: schema?.name,
        description: schema?.description,
        entity: schema?.entity,
        fields: (schema?.fields || []).map((field) => normalizeFieldForDiff(field)),
        conditions: schema?.conditions || []
    });
}

function formatDiffValue(value: any): string {
    if (value === undefined || value === null || value === '') {
        return '-';
    }
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    return String(value);
}

function formatSchemaSummary(schema: ISchemaTemplateSnapshotSchema | undefined): string {
    if (!schema) {
        return 'Not present';
    }
    const parts = [
        `Name: ${formatDiffValue(schema.name || 'Unnamed schema')}`,
        schema.version ? `Version: ${schema.version}` : '',
        schema.entity ? `Entity: ${schema.entity}` : ''
    ].filter(Boolean);
    return parts.join(' | ');
}

function formatFieldSummary(field: any): string {
    if (!field) {
        return 'Not present';
    }
    const parts = [
        field.name ? `Key: ${field.name}` : '',
        field.type ? `Type: ${field.type}` : '',
        field.required ? 'Required' : 'Optional',
        field.isArray ? 'Array' : ''
    ].filter(Boolean);
    return parts.join(' | ');
}

function getFieldDisplayName(field: any): string {
    return field?.description || field?.title || field?.name || 'Unnamed field';
}

function buildDetails(
    previous: any,
    next: any,
    properties: { key: string, label: string }[]
): ISchemaTemplateUpdateChange['details'] {
    return properties
        .map(({ key, label }) => ({
            label,
            before: formatDiffValue(previous?.[key]),
            after: formatDiffValue(next?.[key])
        }))
        .filter((item) => item.before !== item.after);
}

function formatDiffJson(value: any): string {
    if (value === undefined || value === null) {
        return '-';
    }
    if (typeof value === 'string') {
        return value || '-';
    }
    return SchemaHelper.stableStringify(value);
}

function fieldDetailsSource(field: any): any {
    const normalized = normalizeFieldForDiff(field);
    const comment = normalized.comment && typeof normalized.comment === 'object'
        ? normalized.comment
        : {};
    return {
        ...normalized,
        fieldName: normalized.description || normalized.title || normalized.name,
        semanticId: comment['@id'],
        term: comment.term,
        customType: comment.customType || normalized.customType,
        availableOptions: formatDiffJson(comment.availableOptions || normalized.availableOptions),
        orderPosition: comment.orderPosition ?? normalized.order
    };
}

function buildSchemaChangeDetails(
    previous: ISchemaTemplateSnapshotSchema,
    next: ISchemaTemplateSnapshotSchema
): ISchemaTemplateUpdateChange['details'] {
    return buildDetails(previous, next, [
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'entity', label: 'Entity type' }
    ]);
}

function hasDetails(details: ISchemaTemplateUpdateChange['details']): boolean {
    return !!details?.length;
}

export function buildFieldChangeDetails(previous: any, next: any): ISchemaTemplateUpdateChange['details'] {
    return buildDetails(fieldDetailsSource(previous), fieldDetailsSource(next), [
        { key: 'fieldName', label: 'Field Name' },
        { key: 'type', label: 'Type' },
        { key: 'refTemplateSchemaId', label: 'Sub-schema' },
        { key: 'semanticId', label: 'Semantic ID' },
        { key: 'term', label: 'Term' },
        { key: 'customType', label: 'Custom type' },
        { key: 'availableOptions', label: 'Options' },
        { key: 'orderPosition', label: 'Order' },
        { key: 'required', label: 'Required' },
        { key: 'isArray', label: 'Array' },
        { key: 'readOnly', label: 'Read only' },
        { key: 'format', label: 'Format' },
        { key: 'pattern', label: 'Pattern' },
        { key: 'unit', label: 'Unit' },
        { key: 'unitSystem', label: 'Unit system' },
        { key: 'property', label: 'Property' },
        { key: 'hidden', label: 'Hidden' },
        { key: 'autocalculate', label: 'Autocalculate' }
    ]);
}

/**
 * `templateSchemaId` is deliberately stable across template versions and forks, so
 * two lineage-sharing templates applied to the same policy can carry policy schemas
 * with the same `templateSchemaId`. Indexing every policy schema in the topic by
 * that id - without checking which template it belongs to - lets a schema still
 * being added for `templateId` resolve to a sibling template's schema instead and
 * get overwritten. Scoping to this binding's own schemas up front is what keeps two
 * applied templates from reaching into each other's schemaMap.
 */
export function getPolicySchemaByTemplateId(
    policySchemas: Schema[],
    schemaMap: Record<string, string> | undefined,
    templateId: string
): Map<string, Schema> {
    const result = new Map<string, Schema>();
    const policySchemaById = new Map<string, Schema>();
    const ownSchemas = (policySchemas || []).filter(
        (schema) => String(schema?.templateId || '') === String(templateId)
    );
    for (const schema of ownSchemas) {
        policySchemaById.set(String(schema.id || (schema as any)?._id || ''), schema);
        if (schema.templateSchemaId) {
            result.set(schema.templateSchemaId, schema);
        }
    }
    for (const [templateSchemaId, policySchemaId] of Object.entries(schemaMap || {})) {
        const schema = policySchemaById.get(String(policySchemaId));
        if (schema) {
            result.set(templateSchemaId, schema);
        }
    }
    return result;
}

function toPolicySnapshotSchema(schema: Schema): ISchemaTemplateSnapshotSchema {
    return toSnapshotSchema(schema, new Map<string, string>());
}

function findSchemaProperty(document: any, path: string[]): any {
    let current = document;
    for (const key of path) {
        const target = current?.type === 'array' ? current.items : current;
        current = target?.properties?.[key];
        if (!current) {
            return null;
        }
    }
    return current;
}

/**
 * Walk to the object that owns `path`'s last segment.
 *
 * `create` distinguishes the two callers: the target document is being built, so it
 * wants the `properties` containers filled in on the way down; the source document is
 * only being read, and creating nodes there would mutate the very thing being copied
 * from.
 */
function schemaPropertyParent(document: any, path: string[], create: boolean): any {
    let current = document;
    for (const key of path.slice(0, -1)) {
        const parent = current?.type === 'array' ? current.items : current;
        if (create) {
            parent.properties = parent.properties || {};
        }
        current = parent?.properties?.[key];
        if (!current) {
            return null;
        }
    }
    const target = current?.type === 'array' ? current.items : current;
    if (create && target) {
        target.properties = target.properties || {};
    }
    return target;
}

function ensureSchemaPropertyParent(document: any, path: string[]): any {
    return schemaPropertyParent(document, path, true);
}

export function mergeCustomFieldsIntoDocument(
    targetDocument: any,
    sourceDocument: any,
    fields: any[]
): void {
    for (const field of fields || []) {
        const path = String(field.path || field.name || '').split('.').filter(Boolean);
        if (!path.length) {
            continue;
        }
        const property = findSchemaProperty(sourceDocument, path);
        const parent = ensureSchemaPropertyParent(targetDocument, path);
        const fieldName = path[path.length - 1];
        if (!property || !parent || parent.properties?.[fieldName]) {
            continue;
        }
        parent.properties[fieldName] = cloneJson(property);

        /*
         * `required` lives on the parent, so it is copied separately or the preserved
         * field comes back optional. Read it from the source document, not from
         * field.required: parseField sets `required || !!conditionRequired`
         * (interfaces schema-helper.ts:321), which would promote a branch-scoped
         * requirement into an unconditional one.
         */
        const sourceParent = schemaPropertyParent(sourceDocument, path, false);
        if (Array.isArray(sourceParent?.required) && sourceParent.required.includes(fieldName)) {
            parent.required = Array.isArray(parent.required) ? parent.required : [];
            if (!parent.required.includes(fieldName)) {
                parent.required.push(fieldName);
            }
        }
    }
}

async function loadSchemaTemplateUpdateContext(
    templateId: string,
    policyId: string,
    owner: IOwner,
    // false when the caller is previewing rather than updating
    persist: boolean = false,
    // absent: refresh the binding against its own template's current state.
    // present: swap the binding to a different template - `templateId` still names
    // which binding to replace, `targetTemplateId` names what it becomes.
    targetTemplateId?: string
) {
    const resolvedTemplateId = targetTemplateId || templateId;
    const template = await DatabaseServer.getSchemaTemplateById(resolvedTemplateId);
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
    const binding = findSchemaTemplateBinding(policy, templateId);
    if (!binding?.templateId) {
        throw new Error('Schema template is not applied to policy');
    }
    if (!binding.snapshotId) {
        throw new Error('Policy has no applied schema template snapshot');
    }
    if (resolvedTemplateId !== templateId && policyUsesTemplate(policy, template.id)) {
        throw new Error('Schema template is already applied to policy');
    }

    const snapshot = await DatabaseServer.getSchemaTemplateSnapshotById(binding.snapshotId);
    if (!snapshot?.schemas || !snapshot?.config) {
        throw new Error('Applied schema template snapshot is not available');
    }

    const templateSchemas = await DatabaseServer.getSchemas({
        topicId: template.topicId,
        category: SchemaCategory.TEMPLATE,
        templateId: template.id
    });
    if (!templateSchemas.length) {
        throw new Error('Schema template has no schemas');
    }
    for (const schema of templateSchemas as Schema[]) {
        await ensureTemplateSchemaReferences(schema, persist);
    }
    await normalizeSchemaTemplateConfig(template, persist);

    const nextSchemas = buildTemplateSchemasSnapshot(templateSchemas as Schema[]);
    const policySchemas = await DatabaseServer.getSchemas({
        topicId: policy.topicId,
        category: SchemaCategory.POLICY
    });
    return {
        template,
        policy,
        binding,
        snapshot,
        templateSchemas: templateSchemas as Schema[],
        nextSchemas,
        policySchemas: policySchemas as Schema[],
        // Keyed by what the policy's schemas are currently marked with (the binding
        // being replaced), not by the target - those diverge once update switches to
        // a different template, and this map is how the diff finds what already
        // exists in the policy to compare against or remove.
        policySchemaByTemplateId: getPolicySchemaByTemplateId(policySchemas as Schema[], binding.schemaMap, binding.templateId)
    };
}

function buildSchemaTemplateUpdatePreviewFromContext(context: Awaited<ReturnType<typeof loadSchemaTemplateUpdateContext>>): ISchemaTemplateUpdatePreview {
    const changes: ISchemaTemplateUpdateChange[] = [];
    const conflicts: ISchemaTemplateUpdateConflict[] = [];
    const previousSchemas = context.snapshot.schemas?.schemas || {};
    const nextSchemas = context.nextSchemas.schemas || {};
    const previousConfig = context.snapshot.config || { schemas: {} };
    const nextConfig = normalizeTemplateConfigKeys(context.template.config, context.templateSchemas);

    for (const [templateSchemaId, nextSchema] of Object.entries(nextSchemas)) {
        const previousSchema = previousSchemas[templateSchemaId];
        const policySchema = context.policySchemaByTemplateId.get(templateSchemaId);
        if (!previousSchema || !policySchema) {
            changes.push(createChange(
                SchemaTemplateUpdateChangeType.SCHEMA_ADD,
                `Schema "${nextSchema.name}" will be added from the template.`,
                {
                    templateSchemaId,
                    schemaName: nextSchema.name,
                    before: 'Not present',
                    after: formatSchemaSummary(nextSchema)
                }
            ));
            continue;
        }
        const nextSchemaConfig = getSnapshotSchemaConfig(nextConfig, templateSchemaId);
        const policySnapshot = toPolicySnapshotSchema(policySchema);
        const schemaSettingsBefore = nextSchemaConfig.schemaSettingsLocked
            ? policySnapshot
            : previousSchema;
        const schemaDetails = buildSchemaChangeDetails(schemaSettingsBefore, nextSchema);
        const schemaChanged = snapshotSchemaHash(previousSchema) !== snapshotSchemaHash(nextSchema);
        const schemaSettingsWillBeOverwritten = nextSchemaConfig.schemaSettingsLocked && hasDetails(schemaDetails);
        if (schemaChanged || schemaSettingsWillBeOverwritten) {
            changes.push(createChange(
                SchemaTemplateUpdateChangeType.SCHEMA_UPDATE,
                `Schema "${nextSchema.name}" will be updated from the template.`,
                {
                    templateSchemaId,
                    schemaName: nextSchema.name,
                    before: formatSchemaSummary(schemaSettingsBefore),
                    after: formatSchemaSummary(nextSchema),
                    details: schemaDetails
                }
            ));
        }

        const previousFields = fieldsByTemplateId(previousSchema.fields);
        const nextFields = fieldsByTemplateId(nextSchema.fields);
        const policyCustomFields = customFields(policySnapshot.fields);

        for (const [templateFieldId, field] of nextFields.entries()) {
            const previousField = previousFields.get(templateFieldId);
            if (!previousField) {
                changes.push(createChange(
                    SchemaTemplateUpdateChangeType.FIELD_ADD,
                    `Field "${field.title || field.name}" will be added to schema "${nextSchema.name}".`,
                    {
                        templateSchemaId,
                        templateFieldId,
                        schemaName: nextSchema.name,
                        fieldName: getFieldDisplayName(field),
                        before: 'Not present',
                        after: formatFieldSummary(field)
                    }
                ));
            } else if (fieldHash(previousField) !== fieldHash(field)) {
                changes.push(createChange(
                    SchemaTemplateUpdateChangeType.FIELD_UPDATE,
                    `Field "${field.title || field.name}" will be updated in schema "${nextSchema.name}".`,
                    {
                        templateSchemaId,
                        templateFieldId,
                        schemaName: nextSchema.name,
                        fieldName: getFieldDisplayName(field),
                        before: formatFieldSummary(previousField),
                        after: formatFieldSummary(field),
                        details: buildFieldChangeDetails(previousField, field)
                    }
                ));
            }
        }
        for (const [templateFieldId, field] of previousFields.entries()) {
            if (!nextFields.has(templateFieldId)) {
                changes.push(createChange(
                    SchemaTemplateUpdateChangeType.FIELD_REMOVE,
                    `Field "${field.title || field.name}" will be removed from schema "${nextSchema.name}".`,
                    {
                        templateSchemaId,
                        templateFieldId,
                        schemaName: nextSchema.name,
                        fieldName: getFieldDisplayName(field),
                        before: formatFieldSummary(field),
                        after: 'Removed'
                    }
                ));
            }
        }

        for (const field of policyCustomFields) {
            if (nextSchemaConfig.customFieldsLocked) {
                changes.push(createChange(
                    SchemaTemplateUpdateChangeType.CUSTOM_FIELD_REMOVE,
                    `Custom field "${field.title || field.name}" will be removed from schema "${nextSchema.name}".`,
                    {
                        templateSchemaId,
                        schemaName: nextSchema.name,
                        fieldName: getFieldDisplayName(field),
                        before: formatFieldSummary(field),
                        after: 'Removed'
                    }
                ));
            } else {
                changes.push(createChange(
                    SchemaTemplateUpdateChangeType.CUSTOM_FIELD_PRESERVE,
                    `Custom field "${field.title || field.name}" will be preserved in schema "${nextSchema.name}".`,
                    {
                        templateSchemaId,
                        schemaName: nextSchema.name,
                        fieldName: getFieldDisplayName(field),
                        before: formatFieldSummary(field),
                        after: formatFieldSummary(field)
                    }
                ));
            }
        }
    }

    for (const [templateSchemaId, previousSchema] of Object.entries(previousSchemas)) {
        if (nextSchemas[templateSchemaId]) {
            continue;
        }
        const policySchema = context.policySchemaByTemplateId.get(templateSchemaId);
        if (!policySchema) {
            continue;
        }
        const customFieldsCount = getRuntimeCustomFields(policySchema).length;
        const conflictReason = customFieldsCount
            ? ` It contains ${customFieldsCount} custom policy field${customFieldsCount === 1 ? '' : 's'}, so choose whether to keep it as a custom schema or remove it from the policy.`
            : ' Choose whether to keep it as a custom schema or remove it from the policy.';
        changes.push(createChange(
            SchemaTemplateUpdateChangeType.SCHEMA_REMOVE,
            `Schema "${previousSchema.name}" was removed from the template.`,
            {
                templateSchemaId,
                schemaName: previousSchema.name,
                before: formatSchemaSummary(previousSchema),
                after: 'Removed from template'
            }
        ));
        conflicts.push(createConflict(
            SchemaTemplateUpdateConflictType.SCHEMA_REMOVED_WITH_POLICY_USAGE,
            `Schema "${previousSchema.name}" was removed from the template.${conflictReason}`,
            {
                templateSchemaId,
                schemaName: previousSchema.name,
                allowedActions: [
                    SchemaTemplateUpdateResolutionAction.KEEP_AS_CUSTOM_SCHEMA,
                    SchemaTemplateUpdateResolutionAction.REMOVE_FROM_POLICY
                ]
            }
        ));
    }

    return {
        policyId: context.policy.id,
        templateId: context.template.id,
        templateName: context.template.name,
        templateVersion: context.template.version,
        previousTemplateId: context.binding.templateId,
        previousTemplateName: context.binding.templateName,
        previousTemplateVersion: context.binding.templateVersion,
        canApply: conflicts.length === 0,
        changes,
        conflicts
    };
}

async function previewSchemaTemplateUpdate(
    templateId: string,
    policyId: string,
    owner: IOwner,
    targetTemplateId?: string
): Promise<ISchemaTemplateUpdatePreview> {
    return buildSchemaTemplateUpdatePreviewFromContext(
        // preview is a read: it must not persist normalization ids
        await loadSchemaTemplateUpdateContext(templateId, policyId, owner, false, targetTemplateId)
    );
}

function getResolutionMap(options?: ISchemaTemplateUpdateOptions): Map<string, SchemaTemplateUpdateResolutionAction> {
    const result = new Map<string, SchemaTemplateUpdateResolutionAction>();
    for (const resolution of options?.resolutions || []) {
        if (resolution?.conflictId && resolution.action) {
            result.set(resolution.conflictId, resolution.action);
        }
    }
    return result;
}

function validateSchemaTemplateUpdateResolutions(
    preview: ISchemaTemplateUpdatePreview,
    options?: ISchemaTemplateUpdateOptions
): Map<string, SchemaTemplateUpdateResolutionAction> {
    const resolutions = getResolutionMap(options);
    for (const conflict of preview.conflicts.filter((item) => item.allowedActions.length > 1)) {
        const action = resolutions.get(conflict.id);
        if (!action || !conflict.allowedActions.includes(action)) {
            throw new Error(`Schema template update conflict requires resolution: ${conflict.message}`);
        }
    }
    return resolutions;
}

function applySchemaDocumentSettings(document: any, name: string, description: string): void {
    if (!document || typeof document !== 'object') {
        return;
    }
    document.title = name;
    document.description = description;
}

function preparePolicySchemaUpdate(
    target: Schema,
    source: Schema,
    templateId: string,
    schemaConfig: any
): void {
    const previousDocument = cloneJson(target.document);
    const custom = schemaConfig.customFieldsLocked ? [] : getRuntimeCustomFields(target);
    const settingsLocked = !!schemaConfig.schemaSettingsLocked;
    const name = settingsLocked ? source.name : target.name;
    const description = settingsLocked ? source.description : target.description;
    const entity = settingsLocked ? source.entity : target.entity;

    target.name = name;
    target.description = description;
    target.entity = entity;
    target.document = cloneJson(source.document);
    applySchemaDocumentSettings(target.document, name, description);
    target.templateId = templateId;
    target.templateSchemaId = source.templateSchemaId;
    target.category = SchemaCategory.POLICY;
    target.readonly = false;
    target.system = false;
    target.status = SchemaStatus.DRAFT;
    target.errors = [];

    mergeCustomFieldsIntoDocument(target.document, previousDocument, custom);
    SchemaHelper.setVersion(target, target.version, target.version);
    SchemaHelper.updateIRI(target);
}

async function removePolicySchema(schema: Schema, owner: IOwner): Promise<void> {
    await deleteSchema(schema.id, owner, NewNotifier.empty());
}

async function updateAppliedSchemaTemplate(
    templateId: string,
    policyId: string,
    owner: IOwner,
    logger: PinoLogger,
    options?: ISchemaTemplateUpdateOptions
): Promise<any> {
    const context = await loadSchemaTemplateUpdateContext(templateId, policyId, owner, true, options?.targetTemplateId);
    const preview = buildSchemaTemplateUpdatePreviewFromContext(context);
    const resolutions = validateSchemaTemplateUpdateResolutions(preview, options);
    const nextConfig = normalizeTemplateConfigKeys(context.template.config, context.templateSchemas);
    const previousSnapshot = context.snapshot;
    const schemaMap: Record<string, string> = {};
    const iriMap = new Map<string, string>();
    const changedSchemas: Schema[] = [];

    const templateSchemaById = new Map<string, Schema>();
    for (const schema of context.templateSchemas) {
        templateSchemaById.set(schema.templateSchemaId, schema);
    }

    /*
     * The loop below edits existing policy schemas in place and persists each one
     * before the binding is swapped, so the only way to undo is to have captured the
     * originals first. Copies are undone by deletion, edits by restore; both
     * best-effort, and the original error is what surfaces.
     */
    const originalSchemas = new Map<string, Schema>();
    const createdSchemas: Schema[] = [];
    const pendingRemovals: Schema[] = [];
    let nextSnapshot: Awaited<ReturnType<typeof saveApplySnapshot>> | null = null;
    let result: Policy;
    const rollback = async (): Promise<void> => {
        if (nextSnapshot) {
            try {
                await DatabaseServer.removeSchemaTemplateSnapshot(nextSnapshot);
            } catch (error) {
                await logger?.error?.(error, ['GUARDIAN_SERVICE'], owner?.id);
            }
        }
        for (const created of createdSchemas.reverse()) {
            try {
                await removePolicySchema(created, owner);
            } catch (error) {
                await logger?.error?.(error, ['GUARDIAN_SERVICE'], owner?.id);
            }
        }
        for (const original of originalSchemas.values()) {
            try {
                await DatabaseServer.updateSchema(original.id, original);
            } catch (error) {
                await logger?.error?.(error, ['GUARDIAN_SERVICE'], owner?.id);
            }
        }
    };

    /*
     * Apply checks name collisions before copying any schema; update must check the
     * same way before it changes any schema name, or updating one template can
     * silently introduce a name already owned by another applied template or an
     * ordinary policy schema. That happens two ways, not just one: a SCHEMA_ADD
     * copies a schema under a new name, and a schemaSettingsLocked SCHEMA_UPDATE
     * overwrites an already-mapped schema's name with the template's current name
     * (preparePolicySchemaUpdate) - a template-side rename reaching the policy. Both
     * are checked here, before either mutates anything. Runs before the try block: a
     * rejected collision has nothing to roll back yet.
     */
    const schemaConfigByTemplateSchemaId = new Map<string, any>();
    const schemasToAdd: Schema[] = [];
    const schemasBeingRenamed: Schema[] = [];
    // Only a schema actually vacating its current name is excluded from the
    // collision check - an unchanged sibling from the same template keeps its
    // name and must still be able to block a rename or add that lands on it.
    const vacatedSchemaIds = new Set<string>();
    for (const [templateSchemaId, source] of templateSchemaById.entries()) {
        const schemaConfig = getSnapshotSchemaConfig(nextConfig, templateSchemaId);
        schemaConfigByTemplateSchemaId.set(templateSchemaId, schemaConfig);
        const target = context.policySchemaByTemplateId.get(templateSchemaId);
        if (!target) {
            schemasToAdd.push(source);
            continue;
        }
        if (schemaConfig.schemaSettingsLocked &&
            String(source.name || '').trim() !== String(target.name || '').trim()) {
            schemasBeingRenamed.push(source);
            const targetId = String(target.id || (target as any)?._id || '');
            if (targetId) {
                vacatedSchemaIds.add(targetId);
            }
        }
    }
    /*
     * A schema whose templateSchemaId no longer exists in the target (typically
     * because the target is a different template - a genuine swap, or a newer
     * version of the same template whose schemas were republished under new
     * templateSchemaIds) is not renamed in place; it goes through the
     * SCHEMA_REMOVE/conflict path below instead. Its name is not actually freed up
     * unless the caller chose to remove it rather than keep it as a plain custom
     * schema - keeping it leaves it occupying the name, so only a resolved removal
     * excludes it here.
     */
    for (const conflict of preview.conflicts) {
        if (conflict.type !== SchemaTemplateUpdateConflictType.SCHEMA_REMOVED_WITH_POLICY_USAGE) {
            continue;
        }
        if (resolutions.get(conflict.id) !== SchemaTemplateUpdateResolutionAction.REMOVE_FROM_POLICY) {
            continue;
        }
        const removedSchema = conflict.templateSchemaId
            ? context.policySchemaByTemplateId.get(conflict.templateSchemaId)
            : undefined;
        const removedSchemaId = String(removedSchema?.id || (removedSchema as any)?._id || '');
        if (removedSchemaId) {
            vacatedSchemaIds.add(removedSchemaId);
        }
    }
    const schemasToValidate = [...schemasToAdd, ...schemasBeingRenamed];
    if (schemasToValidate.length) {
        await validateSchemaNameCollisions(
            context.template,
            context.policy,
            schemasToValidate,
            vacatedSchemaIds,
            context.policySchemas
        );
    }

    try {
    for (const [templateSchemaId, source] of templateSchemaById.entries()) {
        const target = context.policySchemaByTemplateId.get(templateSchemaId);
        if (target) {
            const targetSourceIri = source.iri;
            // snapshot the row before it is edited, so the edit is undoable
            if (!originalSchemas.has(target.id)) {
                originalSchemas.set(target.id, cloneJson(target));
            }
            preparePolicySchemaUpdate(
                target,
                source,
                context.template.id,
                schemaConfigByTemplateSchemaId.get(templateSchemaId)
            );
            await DatabaseServer.updateSchema(target.id, target);
            schemaMap[templateSchemaId] = target.id;
            if (targetSourceIri && target.iri) {
                iriMap.set(targetSourceIri, target.iri);
            }
            changedSchemas.push(target);
            continue;
        }

        const sourceIri = source.iri;
        const copy = preparePolicySchemaCopy(source, context.policy.topicId, context.template.id);
        const copied = await createSchemaAndArtifacts(
            SchemaCategory.POLICY,
            copy,
            owner,
            NewNotifier.empty()
        );
        schemaMap[templateSchemaId] = copied.id;
        if (sourceIri && copied.iri) {
            iriMap.set(sourceIri, copied.iri);
        }
        createdSchemas.push(copied);
        changedSchemas.push(copied);
    }

    for (const [templateSchemaId, snapshotSchema] of Object.entries(previousSnapshot.schemas?.schemas || {})) {
        if (templateSchemaById.has(templateSchemaId)) {
            continue;
        }
        const policySchema = context.policySchemaByTemplateId.get(templateSchemaId);
        if (!policySchema) {
            continue;
        }
        const conflict = preview.conflicts.find((item) =>
            item.type === SchemaTemplateUpdateConflictType.SCHEMA_REMOVED_WITH_POLICY_USAGE &&
            item.templateSchemaId === templateSchemaId
        );
        const action = conflict ? resolutions.get(conflict.id) : null;
        if (action === SchemaTemplateUpdateResolutionAction.REMOVE_FROM_POLICY) {
            // deleted only past the commit: rollback() restores originalSchemas and
            // drops createdSchemas, and a hard-deleted row is in neither
            pendingRemovals.push(policySchema);
        } else {
            // another in-place edit; capture before detaching the markers
            if (!originalSchemas.has(policySchema.id)) {
                originalSchemas.set(policySchema.id, cloneJson(policySchema));
            }
            policySchema.templateId = '';
            policySchema.templateSchemaId = '';
            SchemaHelper.removeTemplateFieldIds(policySchema.document);
            await DatabaseServer.updateSchema(policySchema.id, policySchema);
            changedSchemas.push(policySchema);
        }
    }

    await updateCopiedSchemaRefs(
        changedSchemas,
        iriMap
    );

    const appliedAt = new Date().toISOString();
    nextSnapshot = await saveApplySnapshot(
        context.template,
        context.policy,
        context.templateSchemas,
        schemaMap,
        appliedAt
    );
    const snapshot = nextSnapshot;

    const updatedBinding = {
        templateId: context.template.id,
        templateName: context.template.name,
        templateVersion: context.template.version,
        templateStatus: context.template.status,
        templateMessageId: context.template.messageId,
        templateStateHash: snapshot.templateStateHash,
        snapshotId: snapshot.id,
        appliedAt: context.binding.appliedAt || appliedAt,
        updatedAt: appliedAt,
        schemaMap
    };
    // Replace in place. Moving the updated binding to the end reorders the list,
    // which is invisible with one binding and silently re-points anything still
    // reading a fixed position once there are several.
    const bindings = context.policy.schemaTemplates || [];
    // The slot being replaced is the binding being updated, not wherever the target
    // template happens to sit - those diverge as soon as the update switches the
    // binding to a different template than the one it started with.
    const index = bindings.findIndex((b) => b.templateId === context.binding.templateId);
    context.policy.schemaTemplates = index < 0
        ? [...bindings, updatedBinding]
        : [...bindings.slice(0, index), updatedBinding, ...bindings.slice(index + 1)];
    result = await DatabaseServer.updatePolicy(context.policy);
    // the old snapshot only goes once the new binding is committed, so a failure
    // above still leaves the policy describable by its old snapshot
    nextSnapshot = null;
    } catch (error) {
        // undo the copies and restore the edited rows, then surface the original
        // failure. Previously only the new snapshot was removed.
        await rollback();
        throw error;
    }

    for (const policySchema of pendingRemovals) {
        try {
            await removePolicySchema(policySchema, owner);
        } catch (error) {
            await logger.error(
                `Schema template update committed, but removing policy schema ${policySchema?.id} failed: ${error?.message}`,
                ['GUARDIAN_SERVICE']
            );
        }
    }
    try {
        await DatabaseServer.removeSchemaTemplateSnapshot(previousSnapshot);
    } catch (error) {
        await logger.error(
            `Schema template update committed, but removing the superseded snapshot failed: ${error?.message}`,
            ['GUARDIAN_SERVICE']
        );
    }
    return result;
}

/**
 * `persist` exists because the read paths must not write. Normalization assigns
 * missing templateSchemaId / templateFieldId, so a non-owner's GET mutated the
 * owner's schemas and concurrent readers raced to store different ids. The ids are
 * still filled in memory, so the response is identical either way.
 */
async function ensureTemplateSchemaReferences(
    schema: Schema,
    persist: boolean = false
): Promise<void> {
    let changed = false;
    if (!schema.templateSchemaId) {
        schema.templateSchemaId = GenerateUUIDv4();
        changed = true;
    }
    changed = SchemaHelper.ensureTemplateFieldIds(schema.document) || changed;
    if (changed && persist) {
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

/**
 * Applying a template copies its schemas into the policy topic under their own
 * names. Nothing downstream enforces name uniqueness there, so two templates that
 * each define a "Project Description" would both land and be told apart only by
 * their iri - indistinguishable in every picker that shows a schema by name.
 *
 * Reject the apply instead of renaming: a renamed copy no longer matches the name
 * in the template it came from, which is the trail the whole feature depends on.
 *
 * Shared by apply (checking every template schema against everything already in
 * the policy) and update's SCHEMA_ADD/rename paths (checking only the schemas the
 * update is about to add or rename). `excludeSchemaIds` leaves only the specific
 * policy schemas about to vacate their current name out of the comparison set - an
 * unchanged sibling schema from the same template keeps its name and must still be
 * able to block a rename or add that collides with it.
 */
export async function validateSchemaNameCollisions(
    template: SchemaTemplate,
    policy: Policy,
    templateSchemas: Schema[],
    excludeSchemaIds?: Set<string>,
    prefetchedPolicySchemas?: Schema[]
): Promise<void> {
    const allExistingSchemas = prefetchedPolicySchemas || await DatabaseServer.getSchemas(
        {
            topicId: policy.topicId,
            category: SchemaCategory.POLICY
        },
        { fields: ['name', 'templateId'] } as any
    );
    const existingSchemas = excludeSchemaIds?.size
        ? (allExistingSchemas as Schema[]).filter(
            (schema) => !excludeSchemaIds.has(String(schema?.id || (schema as any)?._id || ''))
        )
        : (allExistingSchemas as Schema[]);

    const templateNameById = new Map<string, string>();
    for (const binding of policy.schemaTemplates || []) {
        if (binding?.templateId) {
            templateNameById.set(
                String(binding.templateId),
                binding.templateName || String(binding.templateId)
            );
        }
    }

    const existingByName = new Map<string, Schema>();
    for (const schema of existingSchemas as Schema[]) {
        const name = String(schema?.name || '').trim();
        if (name && !existingByName.has(name)) {
            existingByName.set(name, schema);
        }
    }

    /*
     * The two cases need different advice. A name held by another applied template is
     * freed by detaching that template. A name held by an ordinary schema is not:
     * detach leaves the copied schemas behind under their original names, so telling
     * the user to detach after a detach would send them round the same loop.
     */
    const ownedByTemplate: string[] = [];
    const alreadyInPolicy: string[] = [];
    const reported = new Set<string>();
    for (const schema of templateSchemas) {
        const name = String(schema?.name || '').trim();
        if (!name || reported.has(name)) {
            continue;
        }
        const existing = existingByName.get(name);
        if (!existing) {
            continue;
        }
        reported.add(name);
        const ownerName = existing.templateId
            ? templateNameById.get(String(existing.templateId))
            : '';
        if (ownerName) {
            ownedByTemplate.push(`"${name}" (from template "${ownerName}")`);
        } else {
            alreadyInPolicy.push(`"${name}"`);
        }
    }
    if (!ownedByTemplate.length && !alreadyInPolicy.length) {
        return;
    }

    const message = [`Schema template "${template.name}" cannot be applied.`];
    if (ownedByTemplate.length) {
        message.push(
            `These schemas belong to an applied schema template: ${ownedByTemplate.join(', ')}. ` +
            'Detach that template first.'
        );
    }
    if (alreadyInPolicy.length) {
        message.push(
            `The policy already has schemas named ${alreadyInPolicy.join(', ')}. ` +
            'Rename or delete them first.'
        );
    }
    throw new Error(message.join(' '));
}

async function applySchemaTemplate(
    templateId: string,
    policyId: string,
    owner: IOwner,
    logger: PinoLogger
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
    if (policyUsesTemplate(policy, template.id)) {
        throw new Error('Schema template already applied to policy');
    }

    const templateSchemas = await DatabaseServer.getSchemas({
        topicId: template.topicId,
        category: SchemaCategory.TEMPLATE,
        templateId: template.id
    });
    if (!templateSchemas.length) {
        throw new Error('Schema template has no schemas');
    }

    await validateSchemaNameCollisions(template, policy, templateSchemas as Schema[]);

    for (const schema of templateSchemas as Schema[]) {
        await ensureTemplateSchemaReferences(schema, true);
    }

    const schemaMap: Record<string, string> = {};
    const iriMap = new Map<string, string>();
    const copiedSchemas: Schema[] = [];

    /*
     * Undone if any step fails. The copies persist one at a time, so a throw
     * part-way used to leave schemas carrying template markers with no binding - and
     * since the binding is written last, hasSchemaTemplateBinding() still reported
     * false, so a retry copied the whole set again. Best-effort; the original error
     * is the one worth surfacing.
     */
    let snapshot: Awaited<ReturnType<typeof saveApplySnapshot>> | null = null;
    const rollback = async (): Promise<void> => {
        if (snapshot) {
            try {
                await DatabaseServer.removeSchemaTemplateSnapshot(snapshot);
            } catch (error) {
                await logger?.error?.(error, ['GUARDIAN_SERVICE'], owner?.id);
            }
        }
        for (const copied of copiedSchemas.reverse()) {
            try {
                await removePolicySchema(copied, owner);
            } catch (error) {
                await logger?.error?.(error, ['GUARDIAN_SERVICE'], owner?.id);
            }
        }
    };

    try {
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
        snapshot = await saveApplySnapshot(
            template,
            policy,
            templateSchemas as Schema[],
            schemaMap,
            appliedAt
        );

        const newBinding = {
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
        policy.schemaTemplates = [...(policy.schemaTemplates || []), newBinding];
        return await DatabaseServer.updatePolicy(policy);
    } catch (error) {
        // undo the copies and the snapshot, then surface the original failure.
        // Previously only a failing updatePolicy was compensated, and only by
        // removing the snapshot.
        await rollback();
        throw error;
    }
}

/**
 * Drop a policy's template snapshot (and its GridFS payloads, via @AfterDelete)
 * when the policy goes away. Best-effort: the caller is already deleting the
 * policy, so a failed cleanup must not fail the delete.
 */
export async function removePolicySchemaTemplateSnapshot(
    policy: Policy | null | undefined,
    logger?: PinoLogger
): Promise<void> {
    const snapshotIds = ((policy as any)?.schemaTemplates || [])
        .map((binding: any) => binding?.snapshotId)
        .filter((snapshotId: any) => !!snapshotId);
    await Promise.all(snapshotIds.map(async (snapshotId: any) => {
        try {
            const snapshot = await DatabaseServer.getSchemaTemplateSnapshotById(snapshotId);
            if (snapshot) {
                await DatabaseServer.removeSchemaTemplateSnapshot(snapshot);
            }
        } catch (error) {
            await logger?.error(error, ['GUARDIAN_SERVICE']);
        }
    }));
}

async function detachSchemaTemplate(
    policyId: string,
    owner: IOwner,
    templateId: string,
    deleteSchemas: boolean = false
): Promise<any> {
    // A policy can hold several bindings, so an unnamed detach is ambiguous.
    // Guessing here would silently detach somebody else's template.
    if (!templateId) {
        throw new Error('Schema template id is required');
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
    const binding = findSchemaTemplateBinding(policy, templateId);
    if (!binding?.templateId) {
        throw new Error('Schema template is not applied to policy');
    }

    const schemaIds = new Set(Object.values(binding.schemaMap || {}).filter(id => !!id).map(id => String(id)));
    let detachedSchemas = 0;
    let deletedSchemas = 0;
    const deleteErrors: string[] = [];
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
        const schemaName = schema.name || schemaId;
        schema.templateId = '';
        schema.templateSchemaId = '';
        SchemaHelper.removeTemplateFieldIds(schema.document);
        await DatabaseServer.updateSchema(schema.id, schema);
        detachedSchemas++;

        // Detach must always succeed even if some schemas cannot be deleted (e.g. already
        // published), so a delete failure here is reported back, not thrown.
        if (deleteSchemas) {
            try {
                await deleteSchema(schema.id, owner, NewNotifier.empty());
                deletedSchemas++;
            } catch (error) {
                deleteErrors.push(`${schemaName}: ${error.message}`);
            }
        }
    }

    if (binding.snapshotId) {
        const snapshot = await DatabaseServer.getSchemaTemplateSnapshotById(binding.snapshotId);
        if (snapshot) {
            await DatabaseServer.removeSchemaTemplateSnapshot(snapshot);
        }
    }

    policy.schemaTemplates = (policy.schemaTemplates || []).filter((b) => b.templateId !== binding.templateId);
    await DatabaseServer.updatePolicy(policy);
    return {
        policyId: policy.id,
        templateId: binding.templateId,
        detachedSchemas,
        deletedSchemas,
        deleteErrors
    };
}

/**
 * The applied template as the schema editor needs it: binding facts first, since
 * they are the state the policy was applied against, with the live template only
 * filling in what the binding does not carry.
 */
async function describeAppliedSchemaTemplate(
    binding: IPolicySchemaTemplateBinding,
    owner: IOwner
): Promise<any> {
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
 * One entry per applied template. The editor resolves a schema's locks by matching
 * its own templateId against this list, so it needs all of them, not just the first.
 */
async function getAppliedSchemaTemplateByPolicyTopic(
    topicId: string,
    owner: IOwner
): Promise<any[]> {
    const policy = await DatabaseServer.getPolicy({ topicId });
    if (!policy || policy.owner !== owner.owner) {
        throw new Error('Invalid policy');
    }

    const bindings = (policy.schemaTemplates || []).filter((binding) => !!binding?.templateId);
    return Promise.all(bindings.map((binding) => describeAppliedSchemaTemplate(binding, owner)));
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

    ApiResponse(MessageAPI.CREATE_SCHEMA_TEMPLATE_VERSION,
        async (msg: {
            id: string,
            owner: IOwner,
            task: any
        }) => {
            const { id, owner, task } = msg;
            try {
                const notifier = await NewNotifier.create(task);
                RunFunctionAsync(async () => {
                    const result = await createSchemaTemplateVersion(id, owner, logger, notifier);
                    notifier.result(result);
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                    notifier.fail(error);
                });
                return new MessageResponse(task);
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
                    items: await addSchemaCounts(items, owner),
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
                // a read must not write: see ensureTemplateSchemaReferences
                await normalizeSchemaTemplateConfig(template, false);
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
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

                // export is a read too
                await normalizeSchemaTemplateConfig(template, false);
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
                const usedByPolicies = await getPoliciesUsingSchemaTemplate(template, owner.owner);
                if (usedByPolicies.length) {
                    const policyNames = usedByPolicies
                        .map((policy) => policy.name || policy.id)
                        .filter((name) => !!name);
                    const shownPolicies = policyNames.slice(0, 5).join(', ');
                    const hiddenCount = policyNames.length > 5 ? ` and ${policyNames.length - 5} more` : '';
                    throw new Error(
                        `Schema template is used by policies and cannot be deleted. ` +
                        `Detach it from policies first${shownPolicies ? `: ${shownPolicies}${hiddenCount}` : ''}.`
                    );
                }

                if (template.topicId) {
                    const schemas = await DatabaseServer.getSchemas({
                        topicId: template.topicId,
                        category: SchemaCategory.TEMPLATE,
                        templateId: template.id,
                        readonly: false
                    });
                    /*
                     * ensureEditable only blocks a PUBLISHED template, so a PUBLISH_ERROR one is
                     * deletable while its schemas may already be published - and those would be left
                     * with no template to resolve against.
                     */
                    const publishedSchemas = (schemas as Schema[])
                        .filter((schema) => schema.status === SchemaStatus.PUBLISHED);
                    if (publishedSchemas.length) {
                        const names = publishedSchemas
                            .map((schema) => schema.name || schema.iri || schema.id)
                            .filter((name) => !!name);
                        const shown = names.slice(0, 5).join(', ');
                        const hidden = names.length > 5 ? ` and ${names.length - 5} more` : '';
                        throw new Error(
                            `Schema template has published schemas and cannot be deleted` +
                            `${shown ? `: ${shown}${hidden}` : ''}. ` +
                            `They were published by an earlier attempt; retry the publish to finish it.`
                        );
                    }

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

    ApiResponse(MessageAPI.PUBLISH_SCHEMA_TEMPLATE,
        async (msg: {
            id: string,
            owner: IOwner,
            body: { templateVersion: string }
        }) => {
            try {
                const { id, owner, body } = msg;
                if (!body || !body.templateVersion) {
                    throw new Error('Schema template version in body is empty');
                }
                const result = await publishSchemaTemplate(
                    id,
                    body.templateVersion,
                    owner,
                    NewNotifier.empty(),
                    logger
                );
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.PUBLISH_SCHEMA_TEMPLATE_ASYNC,
        async (msg: {
            id: string,
            owner: IOwner,
            body: { templateVersion: string },
            task: any
        }) => {
            const { id, owner, body, task } = msg;
            try {
                const notifier = await NewNotifier.create(task);
                RunFunctionAsync(async () => {
                    if (!body || !body.templateVersion) {
                        throw new Error('Schema template version in body is empty');
                    }
                    const result = await publishSchemaTemplate(
                        id,
                        body.templateVersion,
                        owner,
                        notifier,
                        logger
                    );
                    notifier.result(result);
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                    notifier.fail(error);
                });
                return new MessageResponse(task);
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
                // one template operation per policy at a time. The binding is written
                // last, so it cannot guard the window being raced.
                const result = await withPolicyTemplateLock(policyId, () =>
                    applySchemaTemplate(templateId, policyId, owner, logger));
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.PREVIEW_SCHEMA_TEMPLATE_UPDATE,
        async (msg: {
            templateId: string,
            policyId: string,
            owner: IOwner,
            targetTemplateId?: string
        }) => {
            try {
                const { templateId, policyId, owner, targetTemplateId } = msg;
                const result = await previewSchemaTemplateUpdate(templateId, policyId, owner, targetTemplateId);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.UPDATE_APPLIED_SCHEMA_TEMPLATE,
        async (msg: {
            templateId: string,
            policyId: string,
            owner: IOwner,
            options?: ISchemaTemplateUpdateOptions
        }) => {
            try {
                const { templateId, policyId, owner, options } = msg;
                // shares the lock with APPLY: both rewrite the same policy's schemas
                // and binding.
                const result = await withPolicyTemplateLock(policyId, () =>
                    updateAppliedSchemaTemplate(templateId, policyId, owner, logger, options));
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DETACH_SCHEMA_TEMPLATE,
        async (msg: {
            policyId: string,
            templateId: string,
            owner: IOwner,
            deleteSchemas?: boolean
        }) => {
            try {
                const { policyId, templateId, owner, deleteSchemas } = msg;
                const result = await detachSchemaTemplate(policyId, owner, templateId, deleteSchemas);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });
}
