import { FilterObject } from '@mikro-orm/core';
import {
    BinaryMessageResponse,
    DatabaseServer,
    INotificationStep,
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
            await ensureTemplateSchemaReferences(schema);
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
        await normalizeSchemaTemplateConfig(draft);
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

function hasSchemaTemplateBinding(policy: any): boolean {
    const binding = policy?.schemaTemplate;
    return !!(
        binding?.templateId ||
        binding?.snapshotId ||
        Object.keys(binding?.schemaMap || {}).length
    );
}

async function getPoliciesUsingSchemaTemplate(
    template: SchemaTemplate,
    owner: string
): Promise<any[]> {
    const policies = await DatabaseServer.getPolicies(
        { owner },
        { fields: ['id', 'name', 'schemaTemplate'] } as any
    );
    return (policies as any[]).filter((policy) => {
        const binding = policy?.schemaTemplate;
        return binding?.templateId === template.id ||
            binding?.templateId === template.id?.toString();
    });
}

async function addSchemaCounts(templates: SchemaTemplate[]): Promise<any[]> {
    const ownerPoliciesCache = new Map<string, any[]>();
    const getCachedPolicies = async (owner: string) => {
        if (!ownerPoliciesCache.has(owner)) {
            const policies = await DatabaseServer.getPolicies(
                { owner },
                { fields: ['id', 'name', 'schemaTemplate'] } as any
            );
            ownerPoliciesCache.set(owner, policies as any[]);
        }
        return ownerPoliciesCache.get(owner)!;
    };

    const result = [];
    for (const template of templates) {
        const item: any = template;
        const allPolicies = template.owner ? await getCachedPolicies(template.owner) : [];
        const usedByPolicies = allPolicies.filter((policy) => {
            const binding = policy?.schemaTemplate;
            return binding?.templateId === template.id ||
                binding?.templateId === template.id?.toString();
        });
        item.schemasCount = template.topicId
            ? await DatabaseServer.getSchemasCount({
                topicId: template.topicId,
                category: SchemaCategory.TEMPLATE,
                templateId: template.id
            })
            : 0;
        item.usedByPoliciesCount = usedByPolicies.length;
        item.usedByPolicyNames = usedByPolicies
            .map((policy) => policy.name || policy.id)
            .filter((name) => !!name)
            .slice(0, 5);
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
        await normalizeSchemaTemplateConfig(template);
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
        template.contentFileId = await DatabaseServer.saveFile(GenerateUUIDv4(), Buffer.from(buffer));
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

async function normalizeSchemaTemplateConfig(template: SchemaTemplate): Promise<void> {
    if (!template?.topicId) {
        return;
    }
    const schemas = await DatabaseServer.getSchemas({
        topicId: template.topicId,
        category: SchemaCategory.TEMPLATE,
        templateId: template.id
    });
    for (const schema of schemas as Schema[]) {
        await ensureTemplateSchemaReferences(schema);
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

function getPolicySchemaByTemplateId(
    policySchemas: Schema[],
    schemaMap: Record<string, string> | undefined
): Map<string, Schema> {
    const result = new Map<string, Schema>();
    const policySchemaById = new Map<string, Schema>();
    for (const schema of policySchemas || []) {
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
    owner: IOwner
) {
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
    const binding = policy.schemaTemplate;
    if (!binding?.templateId || !binding?.snapshotId) {
        throw new Error('Policy has no applied schema template snapshot');
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
        await ensureTemplateSchemaReferences(schema);
    }
    await normalizeSchemaTemplateConfig(template);

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
        policySchemaByTemplateId: getPolicySchemaByTemplateId(policySchemas as Schema[], binding.schemaMap)
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
    owner: IOwner
): Promise<ISchemaTemplateUpdatePreview> {
    return buildSchemaTemplateUpdatePreviewFromContext(
        await loadSchemaTemplateUpdateContext(templateId, policyId, owner)
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
    options?: ISchemaTemplateUpdateOptions
): Promise<any> {
    const context = await loadSchemaTemplateUpdateContext(templateId, policyId, owner);
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

    for (const [templateSchemaId, source] of templateSchemaById.entries()) {
        const target = context.policySchemaByTemplateId.get(templateSchemaId);
        if (target) {
            const targetSourceIri = source.iri;
            preparePolicySchemaUpdate(
                target,
                source,
                context.template.id,
                getSnapshotSchemaConfig(nextConfig, templateSchemaId)
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
            await removePolicySchema(policySchema, owner);
        } else {
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
    const snapshot = await saveApplySnapshot(
        context.template,
        context.policy,
        context.templateSchemas,
        schemaMap,
        appliedAt
    );

    context.policy.schemaTemplate = {
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
    try {
        const result = await DatabaseServer.updatePolicy(context.policy);
        await DatabaseServer.removeSchemaTemplateSnapshot(previousSnapshot);
        return result;
    } catch (error) {
        await DatabaseServer.removeSchemaTemplateSnapshot(snapshot);
        throw error;
    }
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
    if (hasSchemaTemplateBinding(policy)) {
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
                const result = await applySchemaTemplate(templateId, policyId, owner);
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
            owner: IOwner
        }) => {
            try {
                const { templateId, policyId, owner } = msg;
                const result = await previewSchemaTemplateUpdate(templateId, policyId, owner);
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
                const result = await updateAppliedSchemaTemplate(templateId, policyId, owner, options);
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
