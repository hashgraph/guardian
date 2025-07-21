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
    SchemaConverterUtils,
    SchemaMessage,
    TagMessage,
    TopicConfig,
    TopicHelper,
    Users
} from '@guardian/common';
import { INotifier } from '../../notifier.js';
import { ImportSchemaError, ImportSchemaMap, ImportSchemaOptions, ImportSchemaResult } from './schema-import.interface.js';
import geoJson from '@guardian/interfaces/dist/helpers/geojson-schema/geo-json.js';
import sentinelHub from '@guardian/interfaces/dist/helpers/sentinel-hub/sentinel-hub-schema.js';
import { checkForCircularDependency, loadSchema } from '../common/load-helper.js';
import { SchemaImportExportHelper } from './schema-import-helper.js';
import { ImportMode } from '../common/import.interface.js';
import { importTag } from '../tag/tag-import-helper.js';
import { INotificationStep } from '../../new-notifier.js';

export class SchemaImport {
    private readonly mode: ImportMode;
    private readonly notifier: INotificationStep;
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

    constructor(mode: ImportMode, notifier: INotificationStep) {
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

    private async resolveAccount(
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ): Promise<IRootConfig> {
        step.start();
        const users = new Users();
        this.root = await users.getHederaAccount(user.creator, userId);
        this.topicHelper = new TopicHelper(
            this.root.hederaAccountId,
            this.root.hederaAccountKey,
            this.root.signOptions
        );
        this.messageServer = new MessageServer({
            operatorId: this.root.hederaAccountId,
            operatorKey: this.root.hederaAccountKey,
            signOptions: this.root.signOptions
        });
        this.owner = user;
        step.complete();
        return this.root;
    }

    private async resolveTopic(
        user: IOwner,
        topicId: string,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
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
            this.topicRow = await TopicConfig.fromObject(await DatabaseServer.getTopicById(topicId), false, userId);
        } else {
            if (topicId === 'draft') {
                this.topicRow = null;
            } else if (topicId) {
                this.topicRow = await TopicConfig.fromObject(await DatabaseServer.getTopicById(topicId), true, userId);
            } else {
                this.topicRow = await this.topicHelper.create({
                    type: TopicType.SchemaTopic,
                    name: TopicType.SchemaTopic,
                    description: TopicType.SchemaTopic,
                    owner: user.creator,
                    policyId: null,
                    policyUUID: null
                }, userId);
                await this.topicRow.saveKeys(userId);
                await DatabaseServer.saveTopic(this.topicRow.toObject());
                await this.topicHelper.twoWayLink(this.topicRow, null, null, this.owner.id);
            }
        }
        this.topicId = this.topicRow?.topicId || 'draft';
        step.complete();
    }

    private async resolveMessages(
        messageIds: string[],
        logger: PinoLogger,
        step: INotificationStep,
        userId: string | null
    ): Promise<ISchema[]> {
        step.start();
        const schemas: ISchema[] = [];

        const relationships = new Set<string>();
        for (const messageId of messageIds) {
            const newSchema = await loadSchema(messageId, logger, userId);
            schemas.push(newSchema);
            for (const id of newSchema.relationships) {
                relationships.add(id);
            }
        }
        for (const messageId of messageIds) {
            relationships.delete(messageId);
        }
        for (const messageId of relationships) {
            const newSchema = await loadSchema(messageId, logger, userId);
            schemas.push(newSchema);
        }

        step.complete();
        return schemas;
    }

    private updateId(schema: ISchema): ISchema {
        let ids: {
            oldID: string | null,
            newID: string | null,
            oldUUID: string | null,
            newUUID: string | null,
            oldMessageID: string | null,
            newMessageID: string | null,
            oldIRI: string | null,
            newIRI: string | null
        }
        if (this.mode === ImportMode.VIEW) {
            const oldUUID = schema.iri ? schema.iri.substring(1) : null;
            const newUUID = oldUUID;
            ids = {
                oldID: schema.id,
                newID: null,
                oldUUID,
                newUUID,
                oldMessageID: schema.messageId,
                newMessageID: schema.messageId,
                oldIRI: `#${oldUUID}`,
                newIRI: `#${newUUID}`,
            }
            schema.uuid = ids.newUUID;
            schema.messageId = ids.newMessageID;
            schema.iri = `#${ids.newUUID}`;
            schema.documentURL = schema.documentURL;
            schema.contextURL = schema.contextURL;
            delete schema.id;
            delete schema._id;
        } else {
            const oldUUID = schema.iri ? schema.iri.substring(1) : null;
            const newUUID = GenerateUUIDv4();
            ids = {
                oldID: schema.id,
                newID: null,
                oldUUID,
                newUUID,
                oldMessageID: schema.messageId,
                newMessageID: null,
                oldIRI: `#${oldUUID}`,
                newIRI: `#${newUUID}`,
            }
            schema.uuid = ids.newUUID;
            schema.messageId = ids.newMessageID;
            schema.iri = `#${ids.newUUID}`;
            schema.documentURL = null;
            schema.contextURL = `schema:${schema.uuid}`;
            delete schema.id;
            delete schema._id;
        }
        this.schemasMapping.push(ids);
        if (ids.oldUUID) {
            this.schemaIdsMapping.set(ids.oldUUID, ids.newUUID);
        }
        return schema;
    }

    private async dataPreparation(
        category: SchemaCategory,
        schemas: ISchema[],
        user: IOwner,
        system: boolean,
        step: INotificationStep,
        userId: string | null
    ) {
        step.addEstimate(schemas.length);
        for (const file of schemas) {
            this.updateId(file);
            file.category = category;
            file.readonly = system;
            file.creator = user.creator;
            file.owner = user.owner;
            file.topicId = this.topicId;
            file.system = false;
            SchemaConverterUtils.SchemaConverter(file);
            file.codeVersion = SchemaConverterUtils.VERSION;
            if (this.mode === ImportMode.DEMO) {
                file.status = SchemaStatus.DEMO;
            } else if (this.mode === ImportMode.VIEW) {
                file.status = SchemaStatus.VIEW;
            } else {
                file.status = SchemaStatus.DRAFT;
            }

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

    private async saveSchemas(
        schemas: ISchema[],
        step: INotificationStep,
        userId: string | null
    ): Promise<void> {
        let index = 0;
        for (const file of schemas) {
            const _step = step.addStep(`${file.name || '-'}`);
            _step.start();

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

            // const errorsCount = await DatabaseServer.getSchemasCount({
            //     iri: {
            //         $eq: schemaObject.iri
            //     },
            //     $or: [{
            //         topicId: { $ne: schemaObject.topicId }
            //     }, {
            //         uuid: { $ne: schemaObject.uuid }
            //     }]
            // } as FilterObject<SchemaCollection>);
            // if (errorsCount > 0) {
            //     throw new Error('Schema identifier already exist');
            // }

            if (this.mode === ImportMode.COMMON) {
                if (this.topicRow) {
                    const message = new SchemaMessage(MessageAction.CreateSchema);
                    message.setDocument(schemaObject);
                    await this.messageServer
                        .setTopicObject(this.topicRow)
                        .sendMessage(message, {
                            sendToIPFS: true,
                            memo: null,
                            userId: this.owner.id,
                            interception: this.owner.id
                        });
                }
            }

            const row = await DatabaseServer.saveSchema(schemaObject);

            this.schemasMapping[index].newID = row.id.toString();
            _step.complete();
            index++;
        }
    }

    /**
     * Import tags by files
     * @param files
     */
    private async importTags(
        topics: Set<string>,
        step: INotificationStep,
        userId: string | null
    ): Promise<void> {
        step.start();
        const tags: any[] = [];
        const messageServer = new MessageServer(null);
        for (const id of topics) {
            const tagMessages = await messageServer.getMessages<TagMessage>(
                id,
                userId,
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
        step.complete();
    }

    public async import(
        components: ISchema[],
        user: IOwner,
        options: ImportSchemaOptions,
        userId: string | null
    ): Promise<ImportSchemaResult> {
        const { topicId, category } = options;

        this.notifier.addStep('Resolve hedera account', 1);
        this.notifier.addStep('Resolve topics', 1);
        this.notifier.addStep('Update UUID', 1);

        this.notifier.start();

        await this.resolveAccount(
            user,
            this.notifier.getStep('Resolve hedera account'),
            userId
        );
        await this.resolveTopic(
            user,
            topicId,
            this.notifier.getStep('Resolve topics'),
            userId
        );

        await this.dataPreparation(
            category,
            components,
            user,
            false,
            this.notifier,
            userId
        );

        this.notifier.getStep('Update UUID').start();
        await this.updateUUIDs(components);
        await this.validateDefs(components);
        this.notifier.getStep('Update UUID').complete();

        await this.saveSchemas(components, this.notifier, userId);

        this.notifier.complete();

        return {
            schemasMap: this.schemasMapping,
            errors: this.errors
        };
    }

    public async importSystem(
        components: ISchema[],
        user: IOwner,
        options: ImportSchemaOptions,
        userId: string | null
    ): Promise<ImportSchemaResult> {
        const { topicId, category } = options;

        this.notifier.addStep('Resolve hedera account', 1);
        this.notifier.addStep('Resolve topics', 1);
        this.notifier.addStep('Update UUID', 1);
        this.notifier.addStep('Import schemas', 20);
        this.notifier.start();

        await this.resolveAccount(
            user,
            this.notifier.getStep('Resolve hedera account'),
            userId
        );
        await this.resolveTopic(
            user,
            topicId,
            this.notifier.getStep('Resolve topics'),
            userId
        );

        await this.dataPreparation(
            category,
            components,
            user,
            true,
            this.notifier.getStep('Import schemas'),
            userId
        );

        this.notifier.getStep('Update UUID').start();
        await this.updateUUIDs(components);
        await this.updateDefs(components);
        this.notifier.getStep('Update UUID').complete();

        await this.saveSchemas(
            components,
            this.notifier.getStep('Import schemas'),
            userId
        );

        this.notifier.complete();

        return {
            schemasMap: this.schemasMapping,
            errors: this.errors
        };
    }

    public async importByMessage(
        messageIds: string[],
        user: IOwner,
        options: ImportSchemaOptions,
        logger: PinoLogger,
        userId: string | null
    ): Promise<ImportSchemaResult> {
        const { topicId, category } = options;

        this.notifier.addStep('Resolve hedera account', 1);
        this.notifier.addStep('Resolve topics', 1);
        this.notifier.addStep('Resolve messages', 1);
        this.notifier.addStep('Update UUID', 1);
        this.notifier.addStep('Import schemas', 20);
        this.notifier.addStep('Import tags', 1);
        this.notifier.start();

        await this.resolveAccount(
            user,
            this.notifier.getStep('Resolve hedera account'),
            userId
        );
        await this.resolveTopic(
            user,
            topicId,
            this.notifier.getStep('Resolve topics'),
            userId
        );
        const components = await this.resolveMessages(
            messageIds,
            logger,
            this.notifier.getStep('Resolve messages'),
            userId
        );
        const topics = new Set(components.map((s) => s.topicId));

        await this.dataPreparation(
            category,
            components,
            user,
            false,
            this.notifier.getStep('Import schemas'),
            userId
        );

        this.notifier.getStep('Update UUID').start();
        await this.updateUUIDs(components);
        await this.validateDefs(components);
        this.notifier.getStep('Update UUID').complete();

        this.notifier.getStep('Save').start();
        await this.saveSchemas(
            components,
            this.notifier.getStep('Import schemas'),
            userId
        );
        this.notifier.getStep('Save').complete();

        await this.importTags(
            topics,
            this.notifier.getStep('Import tags'),
            userId
        );

        this.notifier.complete();

        return {
            schemasMap: this.schemasMapping,
            errors: this.errors
        };
    }
}