import { GenerateUUIDv4, IOwner, IRootConfig, ISchema, ISchemaDocument, ModelHelper, ModuleStatus, Schema, SchemaCategory, SchemaEntity, SchemaHelper, SchemaStatus, TopicType } from '@guardian/interfaces';
import { DatabaseServer, Logger, MessageAction, MessageServer, MessageType, replaceValueRecursive, Schema as SchemaCollection, SchemaConverterUtils, SchemaMessage, Tag, TagMessage, TopicConfig, TopicHelper, UrlType, Users } from '@guardian/common';
import { INotifier } from '../../helpers/notifier.js';
import { importTag } from '../../api/helpers/tag-import-export-helper.js';
import { onlyUnique, checkForCircularDependency } from './schema-helper.js';
import geoJson from '@guardian/interfaces/dist/helpers/geojson-schema/geo-json.js';
import sentinelHub from '@guardian/interfaces/dist/helpers/sentinel-hub/sentinel-hub-schema.js';

export class SchemaCache {
    /**
     * Schema Cache
     */
    private static readonly map = new Map<string, string>();

    /**
     * Check
     * @param id
     */
    public static hasSchema(id: string) {
        return SchemaCache.map.has(id);
    }

    /**
     * Get schema
     * @param id
     */
    public static getSchema(id: string): any | null {
        try {
            const value = SchemaCache.map.get(id);
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    /**
     * Set schema
     * @param id
     * @param schema
     */
    public static setSchema(id: string, schema: any): void {
        try {
            const value = JSON.stringify(schema);
            SchemaCache.map.set(id, value)
        } catch (error) {
            return;
        }
    }
};

/**
 * Load schema
 * @param messageId
 * @param owner
 */
export async function loadSchema(messageId: string): Promise<any> {
    const log = new Logger();
    try {
        let schemaToImport = SchemaCache.getSchema(messageId);
        if (!schemaToImport) {
            const messageServer = new MessageServer(null, null);
            log.info(`loadSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
            const message = await messageServer.getMessage<SchemaMessage>(messageId, MessageType.Schema);
            log.info(`loadedSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
            schemaToImport = {
                iri: null,
                uuid: message.uuid,
                hash: '',
                owner: null,
                messageId,
                name: message.name,
                description: message.description,
                entity: message.entity as SchemaEntity,
                version: message.version,
                creator: message.owner,
                topicId: message.getTopicId(),
                codeVersion: message.codeVersion,
                relationships: message.relationships || [],
                status: SchemaStatus.PUBLISHED,
                readonly: false,
                system: false,
                active: false,
                document: message.getDocument(),
                context: message.getContext(),
                documentURL: message.getDocumentUrl(UrlType.url),
                contextURL: message.getContextUrl(UrlType.url)
            }
            schemaToImport = SchemaHelper.updateIRI(schemaToImport);
            SchemaCache.setSchema(messageId, schemaToImport);
        }
        return schemaToImport;
    } catch (error) {
        log.error(error, ['GUARDIAN_SERVICE']);
        throw new Error(`Cannot load schema ${messageId}`);
    }
}

/**
 * Import tags by files
 * @param result
 * @param files
 * @param topicId
 */
export async function importTagsByFiles(
    result: ImportSchemaResult,
    files: Tag[],
    notifier: INotifier
): Promise<ImportSchemaResult> {
    const { schemasMap } = result;
    const idMap: Map<string, string> = new Map();
    for (const item of schemasMap) {
        idMap.set(item.oldID, item.newID);
        idMap.set(item.oldMessageID, item.newID);
    }
    await importTag(files, idMap);
    return result;
}

export async function getSchemaCategory(topicId: string): Promise<SchemaCategory> {
    if (topicId) {
        const item = await DatabaseServer.getTool({ topicId });
        if (item) {
            return SchemaCategory.TOOL;
        }
    }
    return SchemaCategory.POLICY;
}

export async function getSchemaTarget(topicId: string): Promise<any> {
    if (topicId) {
        const tool = await DatabaseServer.getTool({ topicId });
        if (tool) {
            return { category: SchemaCategory.TOOL, target: tool };
        }
        const policy = await DatabaseServer.getPolicy({ topicId });
        if (policy) {
            return { category: SchemaCategory.POLICY, target: policy };
        }
    }
    return null;
}

/**
 * Prepare schema for preview
 * @param messageIds
 * @param notifier
 */
export async function prepareSchemaPreview(
    messageIds: string[],
    notifier: INotifier
): Promise<any[]> {
    notifier.start('Load schema file');
    const schemas = [];
    for (const messageId of messageIds) {
        const schema = await loadSchema(messageId);
        schemas.push(schema);
    }

    notifier.completedAndStart('Parse schema');
    const messageServer = new MessageServer(null, null);
    const uniqueTopics = schemas.map(res => res.topicId).filter(onlyUnique);
    const anotherSchemas: SchemaMessage[] = [];
    for (const topicId of uniqueTopics) {
        const anotherVersions = await messageServer.getMessages<SchemaMessage>(
            topicId,
            MessageType.Schema,
            MessageAction.PublishSchema
        );
        for (const ver of anotherVersions) {
            anotherSchemas.push(ver);
        }
    }

    notifier.completedAndStart('Verifying');
    for (const schema of schemas) {
        if (!schema.version) {
            continue;
        }
        const newVersions = [];
        const topicMessages = anotherSchemas.filter(item => item.uuid === schema.uuid);
        for (const topicMessage of topicMessages) {
            if (
                topicMessage.version &&
                ModelHelper.versionCompare(topicMessage.version, schema.version) === 1
            ) {
                newVersions.push({
                    messageId: topicMessage.getId(),
                    version: topicMessage.version
                });
            }
        }
        if (newVersions && newVersions.length !== 0) {
            schema.newVersions = newVersions.reverse();
        }
    }
    notifier.completed();
    return schemas;
}

/**
 * Import Result
 */
export interface ImportSchemaMap {
    /**
     * Old schema id
     */
    oldID: string,
    /**
     * New schema id
     */
    newID: string,
    /**
     * Old schema uuid
     */
    oldUUID: string,
    /**
     * New schema uuid
     */
    newUUID: string,
    /**
     * Old schema iri
     */
    oldIRI: string,
    /**
     * New schema iri
     */
    newIRI: string,
    /**
     * Old schema message id
     */
    oldMessageID: string
    /**
     * Old schema message id
     */
    newMessageID: string
}

/**
 * Import Error
 */
export interface ImportSchemaError {
    /**
     * Entity type (schema)
     */
    type: string;
    /**
     * Schema uuid
     */
    uuid: string;
    /**
     * Schema name
     */
    name: string;
    /**
     * Error message
     */
    error: string;
}

/**
 * Import Result
 */
export interface ImportSchemaResult {
    /**
     * New schema uuid
     */
    schemasMap: ImportSchemaMap[];
    /**
     * Errors
     */
    errors: ImportSchemaError[];
}

export class SchemaImport {
    private readonly demo: boolean;
    private readonly notifier: INotifier;
    private readonly schemasMapping: ImportSchemaMap[];
    private readonly schemaIdsMapping: Map<string, string>;
    private readonly externalSchemas: Map<string, string>;
    private readonly validatedSchemas: Map<string, Schema>;
    private readonly errors: ImportSchemaError[];

    private root: IRootConfig;
    private topicHelper: TopicHelper;
    private messageServer: MessageServer;
    private owner: IOwner;
    private topicRow: TopicConfig;
    private topicId: string;

    constructor(demo: boolean, notifier: INotifier) {
        this.demo = demo;
        this.notifier = notifier;
        this.schemasMapping = [];
        this.schemaIdsMapping = new Map<string, string>();
        this.externalSchemas = new Map<string, string>();
        this.validatedSchemas = new Map<string, Schema>();
        this.validatedSchemas.set('#GeoJSON', geoJson as any as Schema);
        this.validatedSchemas.set('#SentinelHUB', sentinelHub as any as Schema);
        this.errors = [];
    }

    public addExternalSchemas(externalSchemas: { name: string, iri: string }[]): void {
        if (externalSchemas) {
            for (const schema of externalSchemas) {
                this.externalSchemas.set(schema.name, schema.iri);
            }
        }
    }

    private async resolveAccount(user: IOwner): Promise<IRootConfig> {
        this.notifier.start('Resolve Hedera account');
        const users = new Users();
        this.root = await users.getHederaAccount(user.creator);
        this.topicHelper = new TopicHelper(
            this.root.hederaAccountId,
            this.root.hederaAccountKey,
            this.root.signOptions
        );
        this.messageServer = new MessageServer(
            this.root.hederaAccountId,
            this.root.hederaAccountKey,
            this.root.signOptions
        );
        this.owner = user;
        return this.root;
    }

    private async resolveTopic(user: IOwner, topicId: string) {
        this.notifier.completedAndStart('Resolve Topics');

        if (this.demo) {
            this.topicRow = new TopicConfig({
                type: TopicType.SchemaTopic,
                name: TopicType.SchemaTopic,
                description: TopicType.SchemaTopic,
                owner: user.creator,
                policyId: null,
                policyUUID: null,
                topicId
            }, null, null)
        } else if (topicId === 'draft') {
            this.topicRow = null;
        } else if (topicId) {
            this.topicRow = await TopicConfig.fromObject(await DatabaseServer.getTopicById(topicId), true);
        } else {
            this.topicRow = await this.topicHelper.create({
                type: TopicType.SchemaTopic,
                name: TopicType.SchemaTopic,
                description: TopicType.SchemaTopic,
                owner: user.creator,
                policyId: null,
                policyUUID: null
            });
            await this.topicRow.saveKeys();
            await DatabaseServer.saveTopic(this.topicRow.toObject());
            await this.topicHelper.twoWayLink(this.topicRow, null, null, this.owner.id);
        }
        this.topicId = this.topicRow?.topicId || 'draft';
    }

    private async resolveMessages(messageIds: string[]): Promise<ISchema[]> {
        this.notifier.start('Resolve schema messages');

        const schemas: ISchema[] = [];

        const relationships = new Set<string>();
        for (const messageId of messageIds) {
            const newSchema = await loadSchema(messageId);
            schemas.push(newSchema);
            for (const id of newSchema.relationships) {
                relationships.add(id);
            }
        }
        for (const messageId of messageIds) {
            relationships.delete(messageId);
        }
        for (const messageId of relationships) {
            const newSchema = await loadSchema(messageId);
            schemas.push(newSchema);
        }

        return schemas;
    }

    private updateId(schema: ISchema, generateNewId: boolean): ISchema {
        const oldID = schema.id;
        const oldUUID = schema.iri ? schema.iri.substring(1) : null;
        const newUUID = generateNewId ? GenerateUUIDv4() : oldUUID;

        this.schemasMapping.push({
            oldID,
            newID: null,
            oldUUID,
            newUUID,
            oldIRI: `#${oldUUID}`,
            newIRI: `#${newUUID}`,
            oldMessageID: schema.messageId,
            newMessageID: null,
        })
        if (oldUUID) {
            this.schemaIdsMapping.set(oldUUID, newUUID);
        }
        schema.uuid = newUUID;
        schema.messageId = null;
        return schema;
    }

    private async dataPreparation(
        category: SchemaCategory,
        schemas: ISchema[],
        user: IOwner,
        skipGenerateId: boolean
    ) {
        this.notifier.info(`Found ${schemas.length} schemas`);
        for (const file of schemas) {
            this.updateId(file, !skipGenerateId);

            SchemaConverterUtils.SchemaConverter(file);
            file.iri = '#' + file.uuid;
            file.documentURL = null;
            file.contextURL = `schema:${file.uuid}`;
            file.creator = user.creator;
            file.owner = user.owner;
            file.topicId = this.topicId;
            file.status = this.demo ? SchemaStatus.DEMO : SchemaStatus.DRAFT;
            file.category = category;
            file.readonly = false;
            file.system = false;
            file.codeVersion = SchemaConverterUtils.VERSION;
            delete file.id;
            delete file._id;
            delete file.status;

            //Find external schemas by Title
            const defs = SchemaImportExportHelper.getDefDocuments(file);
            for (const def of defs) {
                if (def && !this.schemaIdsMapping.has(def.$id)) {
                    const externalSchemaIRI = this.externalSchemas.get(def.title);
                    if (externalSchemaIRI) {
                        this.schemaIdsMapping.set(def.$id, externalSchemaIRI);
                    }
                }
            }
        }
    }

    private async updateUUIDs(schemas: ISchema[]): Promise<void> {
        for (const file of schemas) {
            if (file.document) {
                file.document = replaceValueRecursive(file.document, this.schemaIdsMapping);
            }
            if (file.context) {
                file.context = replaceValueRecursive(file.context, this.schemaIdsMapping);
            }
            file.sourceVersion = file.version;
            SchemaHelper.setVersion(file, '', '');
        }
    }

    private async validateDefs(schemas: ISchema[]): Promise<void> {
        const tools = await DatabaseServer.getTools({ status: ModuleStatus.PUBLISHED }, { fields: ['topicId'] });
        const toolSchemas = await DatabaseServer.getSchemas({ topicId: { $in: tools.map(t => t.topicId) } });

        const allSchemas: Schema[] = [];
        for (const item of schemas) {
            allSchemas.push(new Schema(item, true));
        }
        for (const item of toolSchemas) {
            allSchemas.push(new Schema(item, true));
        }

        for (const file of schemas) {
            const error = SchemaImportExportHelper.validateDefs(file.iri, allSchemas, this.validatedSchemas);
            if (error) {
                this.errors.push({
                    type: 'schema',
                    uuid: file.uuid,
                    name: file.name,
                    error
                });
            }
        }
    }

    private async saveSchemas(schemas: ISchema[]): Promise<void> {
        let index = 0;
        for (const file of schemas) {
            const label = `Schema ${index + 1} (${file.name || '-'})`;

            const schema = this.validatedSchemas.get(file.iri);
            file.document = schema.document;

            if (checkForCircularDependency(file)) {
                throw new Error(`There is circular dependency in schema: ${file.iri}`);
            }

            const schemaObject = DatabaseServer.createSchema(file);
            const errors = SchemaHelper.checkErrors(file as Schema);
            SchemaHelper.updateIRI(schemaObject);
            schemaObject.errors = errors;
            schemaObject.status = errors?.length ? SchemaStatus.ERROR : SchemaStatus.DRAFT;

            const errorsCount = await DatabaseServer.getSchemasCount({
                iri: {
                    $eq: schemaObject.iri
                },
                $or: [{
                    topicId: { $ne: schemaObject.topicId }
                }, {
                    uuid: { $ne: schemaObject.uuid }
                }]
            });
            if (errorsCount > 0) {
                throw new Error('Schema identifier already exist');
            }

            this.notifier.info(`${label}: Save to IPFS & Hedera`);
            if (this.topicRow && !this.demo) {
                const message = new SchemaMessage(MessageAction.CreateSchema);
                message.setDocument(schemaObject);
                await this.messageServer
                    .setTopicObject(this.topicRow)
                    .sendMessage(message, true, null, this.owner.id);
            }

            this.notifier.info(`${label}: Update schema in DB`);
            const row = await DatabaseServer.saveSchema(schemaObject);

            this.schemasMapping[index].newID = row.id.toString();
            this.notifier.info(`${label}: Created`);
            index++;
        }
    }

    /**
     * Import tags by files
     * @param files
     */
    private async importTags(topics: Set<string>): Promise<void> {
        this.notifier.start('Load tags');
        const tags: any[] = [];
        const messageServer = new MessageServer(null, null);
        for (const id of topics) {
            const tagMessages = await messageServer.getMessages<TagMessage>(
                id,
                MessageType.Tag,
                MessageAction.PublishTag
            );
            for (const tag of tagMessages) {
                tags.push({
                    uuid: tag.uuid,
                    name: tag.name,
                    description: tag.description,
                    owner: tag.owner,
                    entity: tag.entity,
                    target: tag.target,
                    status: 'History',
                    topicId: tag.topicId,
                    messageId: tag.id,
                    document: null,
                    uri: null,
                    date: tag.date,
                    id: null
                });
            }
        }

        const idMap: Map<string, string> = new Map();
        for (const item of this.schemasMapping) {
            idMap.set(item.oldID, item.newID);
            idMap.set(item.oldMessageID, item.newID);
        }
        await importTag(tags, idMap);
    }

    public async import(
        components: ISchema[],
        user: IOwner,
        options: {
            topicId: string,
            category: SchemaCategory,
            skipGenerateId?: boolean
        },
    ): Promise<ImportSchemaResult> {
        const { topicId, category, skipGenerateId } = options;

        this.notifier.start('Import schemas');

        console.log('---- resolveAccount ---')
        await this.resolveAccount(user);
        console.log('---- resolveTopic ---')
        await this.resolveTopic(user, topicId);
        console.log('---- dataPreparation ---')
        await this.dataPreparation(category, components, user, skipGenerateId);
        console.log('---- updateUUIDs ---')
        await this.updateUUIDs(components);
        console.log('---- validateDefs ---')
        await this.validateDefs(components);
        console.log('---- saveSchemas ---')
        await this.saveSchemas(components);

        this.notifier.completed();

        return {
            schemasMap: this.schemasMapping,
            errors: this.errors
        };
    }

    public async importByMessage(
        messageIds: string[],
        user: IOwner,
        options: {
            topicId: string,
            category: SchemaCategory,
            skipGenerateId?: boolean
        },
    ): Promise<ImportSchemaResult> {
        const { topicId, category, skipGenerateId } = options;

        this.notifier.start('Import schemas');

        await this.resolveAccount(user);
        await this.resolveTopic(user, topicId);
        const components = await this.resolveMessages(messageIds);
        const topics = new Set(components.map((s) => s.topicId));

        await this.dataPreparation(category, components, user, skipGenerateId);
        await this.updateUUIDs(components);
        await this.validateDefs(components);
        await this.saveSchemas(components);
        await this.importTags(topics);
        this.notifier.completed();

        return {
            schemasMap: this.schemasMapping,
            errors: this.errors
        };
    }
}

/**
 * Schema import export helper
 */
export class SchemaImportExportHelper {
    /**
     * Export schemas
     * @param ids Schemas ids
     * @returns Schemas to export
     */
    public static async exportSchemas(ids: string[]): Promise<SchemaCollection[]> {
        const schemas = await DatabaseServer.getSchemasByIds(ids);
        const map = new Map<string, SchemaCollection>();
        for (const schema of schemas) {
            map.set(schema.iri, schema);
        }

        const defs = new Set<string>();
        for (const schema of schemas) {
            const keys = SchemaImportExportHelper.getDefs(schema);
            for (const iri of keys) {
                if (!map.has(iri)) {
                    defs.add(iri);
                }
            }
        }

        const sub = await DatabaseServer.getSchemas({ iri: { $in: Array.from(defs) } });
        for (const schema of sub) {
            map.set(schema.iri, schema);
        }

        return Array.from(map.values());
    }

    /**
     * Get defs
     * @param schema
     */
    public static getDefs(schema: ISchema): string[] {
        try {
            let document: ISchemaDocument = schema.document;
            if (typeof document === 'string') {
                document = JSON.parse(document);
            }
            if (!document.$defs) {
                return [];
            }
            return Object.keys(document.$defs);
        } catch (error) {
            return [];
        }
    }

    /**
     * Get defs
     * @param schema
     */
    public static getDefDocuments(schema: ISchema): ISchemaDocument[] {
        try {
            let document: ISchemaDocument = schema.document;
            if (typeof document === 'string') {
                document = JSON.parse(document);
            }
            if (document && document.$defs) {
                return Object.values(document.$defs);
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Validate and update schema defs
     * 
     * @param target Schema iri
     * @param allSchemas Schemas
     * @param validatedSchemas Schemas
     */
    public static validateDefs(
        target: string,
        allSchemas: Schema[],
        validatedSchemas: Map<string, Schema>
    ): string {
        if (validatedSchemas.has(target)) {
            return null;
        }

        const schema = allSchemas.find((s) => s.iri === target);
        if (!schema) {
            return 'Invalid defs';
        }

        if (checkForCircularDependency(schema)) {
            return `There is circular dependency in schema: ${target}`;
        }

        let valid = true;
        for (const field of schema.fields) {
            if (field.isRef) {
                const error = SchemaImportExportHelper.validateDefs(field.type, allSchemas, validatedSchemas);
                if (error) {
                    field.type = null;
                    valid = false;
                }
            }
        }
        schema.update(schema.fields, schema.conditions);
        schema.updateRefs(allSchemas);

        validatedSchemas.set(target, schema);

        if (!valid) {
            return 'Invalid defs';
        } else {
            return null;
        }
    }

    /**
     * Import schema by files
     * @param files
     * @param user
     * @param options
     * @param notifier
     */
    public static async importSchemaByFiles(
        files: ISchema[],
        user: IOwner,
        options: {
            topicId: string,
            category: SchemaCategory,
            skipGenerateId?: boolean,
            outerSchemas?: { name: string, iri: string }[],
            demo?: boolean
        },
        notifier: INotifier
    ): Promise<ImportSchemaResult> {
        const helper = new SchemaImport(options.demo, notifier);
        helper.addExternalSchemas(options.outerSchemas);
        return helper.import(files, user, options);
    }

    /**
     * Import schemas by messages
     * @param owner
     * @param messageIds
     * @param topicId
     * @param notifier
     */
    public static async importSchemasByMessages(
        messageIds: string[],
        user: IOwner,
        options: {
            topicId: string,
            category: SchemaCategory,
            demo?: boolean
        },
        notifier: INotifier
    ): Promise<ImportSchemaResult> {
        const helper = new SchemaImport(options.demo, notifier);
        return helper.importByMessage(messageIds, user, options);
    }
}