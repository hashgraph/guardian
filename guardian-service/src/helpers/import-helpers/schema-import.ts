import {
    GenerateUUIDv4,
    IOwner,
    IRootConfig,
    ISchema,
    ModuleStatus,
    Schema,
    SchemaCategory,
    SchemaHelper,
    SchemaStatus,
    TopicType,
} from '@guardian/interfaces';
import {
    DatabaseServer,
    PinoLogger,
    MessageAction,
    MessageServer,
    MessageType,
    replaceValueRecursive,
    Schema as SchemaCollection,
    SchemaConverterUtils,
    SchemaMessage,
    TagMessage,
    TopicConfig,
    TopicHelper,
    Users
} from '@guardian/common';
import { FilterObject } from '@mikro-orm/core';
import { INotifier } from '../../helpers/notifier.js';
import { ImportSchemaError, ImportSchemaMap, ImportSchemaResult } from './schema-import.interface.js';
import geoJson from '@guardian/interfaces/dist/helpers/geojson-schema/geo-json.js';
import sentinelHub from '@guardian/interfaces/dist/helpers/sentinel-hub/sentinel-hub-schema.js';
import { checkForCircularDependency, loadSchema } from './load-helper.js';
import { SchemaImportExportHelper } from './schema-import-helper.js';
import { ImportMode } from './import.interface.js';
import { importTag } from './tag-import-helper.js';

export class SchemaImport {
    private readonly mode: ImportMode;
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

    constructor(mode: ImportMode, notifier: INotifier) {
        this.mode = mode;
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

        if (this.mode === ImportMode.DEMO) {
            this.topicRow = new TopicConfig({
                type: TopicType.SchemaTopic,
                name: TopicType.SchemaTopic,
                description: TopicType.SchemaTopic,
                owner: user.creator,
                policyId: null,
                policyUUID: null,
                topicId
            }, null, null)
        } else if (this.mode === ImportMode.VIEW) {

        } else {
            if (topicId === 'draft') {
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
        }
        this.topicId = this.topicRow?.topicId || 'draft';
    }

    private async resolveMessages(messageIds: string[], logger: PinoLogger): Promise<ISchema[]> {
        this.notifier.start('Resolve schema messages');

        const schemas: ISchema[] = [];

        const relationships = new Set<string>();
        for (const messageId of messageIds) {
            const newSchema = await loadSchema(messageId, logger);
            schemas.push(newSchema);
            for (const id of newSchema.relationships) {
                relationships.add(id);
            }
        }
        for (const messageId of messageIds) {
            relationships.delete(messageId);
        }
        for (const messageId of relationships) {
            const newSchema = await loadSchema(messageId, logger);
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
        skipGenerateId: boolean,
        system: boolean
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
            file.category = category;
            file.readonly = system;
            file.system = false;
            file.codeVersion = SchemaConverterUtils.VERSION;
            if (this.mode === ImportMode.DEMO) {
                file.status = SchemaStatus.DEMO;
            } else if (this.mode === ImportMode.VIEW) {
                file.status = SchemaStatus.VIEW;
            } else {
                file.status = SchemaStatus.DRAFT;
            }

            delete file.id;
            delete file._id;

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

    private async updateDefs(schemas: ISchema[]): Promise<void> {
        for (const file of schemas) {
            const schema = new Schema(file, true);
            this.validatedSchemas.set(file.iri, schema);
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
            if (errors?.length) {
                schemaObject.status = SchemaStatus.ERROR;
            }

            const errorsCount = await DatabaseServer.getSchemasCount({
                iri: {
                    $eq: schemaObject.iri
                },
                $or: [{
                    topicId: { $ne: schemaObject.topicId }
                }, {
                    uuid: { $ne: schemaObject.uuid }
                }]
            } as FilterObject<SchemaCollection>);
            if (errorsCount > 0) {
                throw new Error('Schema identifier already exist');
            }

            this.notifier.info(`${label}: Save to IPFS & Hedera`);
            if (this.mode === ImportMode.COMMON) {
                if (this.topicRow) {
                    const message = new SchemaMessage(MessageAction.CreateSchema);
                    message.setDocument(schemaObject);
                    await this.messageServer
                        .setTopicObject(this.topicRow)
                        .sendMessage(message, true, null, this.owner.id);
                }
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

        await this.resolveAccount(user);
        await this.resolveTopic(user, topicId);
        await this.dataPreparation(category, components, user, skipGenerateId, false);
        await this.updateUUIDs(components);
        await this.validateDefs(components);
        await this.saveSchemas(components);

        this.notifier.completed();

        return {
            schemasMap: this.schemasMapping,
            errors: this.errors
        };
    }

    public async importSystem(
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

        await this.resolveAccount(user);
        await this.resolveTopic(user, topicId);
        await this.dataPreparation(category, components, user, skipGenerateId, true);
        await this.updateUUIDs(components);
        await this.updateDefs(components);
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
        logger: PinoLogger
    ): Promise<ImportSchemaResult> {
        const { topicId, category, skipGenerateId } = options;

        this.notifier.start('Import schemas');

        await this.resolveAccount(user);
        await this.resolveTopic(user, topicId);
        const components = await this.resolveMessages(messageIds, logger);
        const topics = new Set(components.map((s) => s.topicId));

        await this.dataPreparation(category, components, user, skipGenerateId, false);
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