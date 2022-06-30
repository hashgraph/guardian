import { Schema as SchemaCollection } from '@entity/schema';
import { Topic } from '@entity/topic';
import {
    ISchema,
    MessageAPI,
    SchemaEntity,
    SchemaStatus,
    TopicType,
    SchemaHelper,
    ModelHelper, GenerateUUIDv4,
} from '@guardian/interfaces';
import path from 'path';
import { readJSON } from 'fs-extra';
import { getMongoRepository, MongoRepository } from 'typeorm';
import { schemasToContext } from '@transmute/jsonld-schema';
import { MessageAction, MessageServer, MessageType, SchemaMessage, UrlType } from '@hedera-modules';
import { replaceValueRecursive } from '@helpers/utils';
import { Users } from '@helpers/users';
import { ApiResponse } from '@api/api-response';
import { TopicHelper } from '@helpers/topicHelper';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';

export const schemaCache = {};

/**
 * Creation of default schemas.
 *
 * @param schemaRepository - table with schemas
 */
export async function setDefaultSchema() {
    const fileConfig = path.join(process.cwd(), 'system-schemas', 'system-schemas.json');
    let fileContent: any;
    try {
        fileContent = await readJSON(fileConfig);
    } catch (error) {
        throw new Error('you need to create a file \'system-schemas.json\'');
    }

    const map: any = {};
    for (const schema of fileContent) {
        map[schema.entity] = schema;
    }

    if (!map.hasOwnProperty(SchemaEntity.MINT_NFTOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.MINT_NFTOKEN} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.MINT_TOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.MINT_TOKEN} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.POLICY)) {
        throw new Error(`You need to fill ${SchemaEntity.POLICY} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.STANDARD_REGISTRY)) {
        throw new Error(`You need to fill ${SchemaEntity.STANDARD_REGISTRY} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.WIPE_TOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.WIPE_TOKEN} field in system-schemas.json file`);
    }

    const fn = async (schema: any) => {
        const existingSchemas = await getMongoRepository(SchemaCollection).findOne({ uuid: schema.uuid });
        if (existingSchemas) {
            console.log(`Skip schema: ${schema.uuid}`);
            return;
        }
        schema.owner = null;
        schema.creator = null;
        schema.readonly = true;
        schema.system = true;
        schema.active = true;
        const item: any = getMongoRepository(SchemaCollection).create(schema);
        await getMongoRepository(SchemaCollection).save(item);
        console.log(`Created schema: ${schema.uuid}`);
    }

    await fn(map[SchemaEntity.MINT_NFTOKEN]);
    await fn(map[SchemaEntity.MINT_TOKEN]);
    await fn(map[SchemaEntity.POLICY]);
    await fn(map[SchemaEntity.STANDARD_REGISTRY]);
    await fn(map[SchemaEntity.WIPE_TOKEN]);
}

/**
 * Load schema
 * @param messageId
 * @param owner
 */
async function loadSchema(messageId: string, owner: string) {
    const log = new Logger();
    try {
        if (schemaCache[messageId]) {
            return schemaCache[messageId];
        }
        const messageServer = new MessageServer();
        log.info(`loadSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
        const message = await messageServer.getMessage<SchemaMessage>(messageId, MessageType.Schema);
        log.info(`loadedSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
        const schemaToImport: any = {
            uuid: message.uuid,
            hash: '',
            name: message.name,
            description: message.description,
            entity: message.entity as SchemaEntity,
            status: SchemaStatus.PUBLISHED,
            readonly: false,
            system: false,
            active: false,
            document: message.getDocument(),
            context: message.getContext(),
            version: message.version,
            creator: message.owner,
            owner,
            topicId: message.getTopicId(),
            messageId,
            documentURL: message.getDocumentUrl(UrlType.url),
            contextURL: message.getContextUrl(UrlType.url),
            iri: null
        }
        SchemaHelper.updateIRI(schemaToImport);
        log.info(`loadSchema end: ${messageId}`, ['GUARDIAN_SERVICE']);
        schemaCache[messageId] = { ...schemaToImport };
        return schemaToImport;
    } catch (error) {
        log.error(error, ['GUARDIAN_SERVICE']);
        throw new Error(`Cannot load schema ${messageId}`);
    }
}

/**
 * Get defs
 * @param schema
 */
function getDefs(schema: ISchema) {
    try {
        let document: any = schema.document;
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
 * Only unique
 * @param value
 * @param index
 * @param self
 */
function onlyUnique(value: any, index: any, self: any): boolean {
    return self.indexOf(value) === index;
}

/**
 * Increment schema version
 * @param iri
 * @param owner
 */
export async function incrementSchemaVersion(iri: string, owner: string): Promise<SchemaCollection> {
    if (!owner || !iri) {
        throw new Error(`Invalid increment schema version parameter`);
    }

    const schema = await getMongoRepository(SchemaCollection).findOne({ iri, owner });

    if (!schema) {
        throw new Error(`Schema not found: ${iri} for owner ${owner}`);
    }

    if (schema.status === SchemaStatus.PUBLISHED) {
        return schema;
    }

    const { previousVersion } = SchemaHelper.getVersion(schema);
    let newVersion = '1.0.0';
    if (previousVersion) {
        const schemas = await getMongoRepository(SchemaCollection).find({ uuid: schema.uuid });
        const versions = [];
        for (const element of schemas) {
            const elementVersions = SchemaHelper.getVersion(element);
            versions.push(elementVersions.version, elementVersions.previousVersion);
        }
        newVersion = SchemaHelper.incrementVersion(previousVersion, versions);
    }
    schema.version = newVersion;

    return schema;
}

/**
 * Create schema
 * @param newSchema
 * @param owner
 */
async function createSchema(newSchema: ISchema, owner: string): Promise<SchemaCollection> {
    const users = new Users();
    const root = await users.getHederaAccount(owner);
    const schemaObject = getMongoRepository(SchemaCollection)
        .create(newSchema) as SchemaCollection;

    let topic: Topic;
    if (newSchema.topicId) {
        topic = await getMongoRepository(Topic).findOne({ topicId: newSchema.topicId });
    }

    if (!topic) {
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);
        topic = await topicHelper.create({
            type: TopicType.SchemaTopic,
            name: TopicType.SchemaTopic,
            description: TopicType.SchemaTopic,
            owner,
            policyId: null,
            policyUUID: null
        });
        await topicHelper.twoWayLink(topic, null, null);
    }

    SchemaHelper.updateIRI(schemaObject);
    schemaObject.status = SchemaStatus.DRAFT;
    schemaObject.topicId = topic.topicId;
    schemaObject.iri = schemaObject.iri || `${schemaObject.uuid}`;

    const errorsCount = await getMongoRepository(SchemaCollection).count({
        where: {
            iri: {
                $eq: schemaObject.iri
            },
            $or: [
                {
                    topicId: {
                        $ne: schemaObject.topicId
                    }
                },
                {
                    uuid: {
                        $ne: schemaObject.uuid
                    }
                }
            ]
        }
    });
    if (errorsCount > 0) {
        throw new Error('Schema identifier already exist');
    }

    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
    const message = new SchemaMessage(MessageAction.CreateSchema);
    message.setDocument(schemaObject);
    await messageServer.setTopicObject(topic).sendMessage(message);

    return await getMongoRepository(SchemaCollection).save(schemaObject);
}

/**
 * Import schema by files
 * @param owner
 * @param files
 * @param topicId
 */
export async function importSchemaByFiles(owner: string, files: ISchema[], topicId: string) {
    const uuidMap: Map<string, string> = new Map();
    for (const file of files) {
        const newUUID = GenerateUUIDv4();
        const uuid = file.iri ? file.iri.substring(1) : null;
        if (uuid) {
            uuidMap.set(uuid, newUUID);
        }
        file.uuid = newUUID;
        file.iri = '#' + newUUID;
    }

    for (const file of files) {
        file.document = replaceValueRecursive(file.document, uuidMap);
        file.context = replaceValueRecursive(file.context, uuidMap);
        file.messageId = null;
        file.creator = owner;
        file.owner = owner;
        file.topicId = topicId;
        file.status = SchemaStatus.DRAFT;
        SchemaHelper.setVersion(file, '', '');
        await createSchema(file, owner);
    }
    const schemasMap = [];
    uuidMap.forEach((v, k) => {
        schemasMap.push({
            oldUUID: k,
            newUUID: v,
            oldIRI: `#${k}`,
            newIRI: `#${v}`
        })
    });
    return schemasMap;
}

/**
 * Publish schema
 * @param item
 * @param version
 * @param messageServer
 * @param type
 */
export async function publishSchema(
    item: SchemaCollection,
    version: string,
    messageServer: MessageServer,
    type?: MessageAction
): Promise<SchemaCollection> {
    SchemaHelper.updateVersion(item, version);

    const itemDocument = item.document;
    const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];
    item.context = schemasToContext([...defsArray, itemDocument]);

    const message = new SchemaMessage(type || MessageAction.PublishSchema);
    message.setDocument(item);
    const result = await messageServer
        .sendMessage(message);

    const messageId = result.getId();
    const topicId = result.getTopicId();
    const contextUrl = result.getDocumentUrl(UrlType.url);
    const documentUrl = result.getContextUrl(UrlType.url);

    item.status = SchemaStatus.PUBLISHED;
    item.documentURL = documentUrl;
    item.contextURL = contextUrl;
    item.messageId = messageId;
    item.topicId = topicId;

    SchemaHelper.updateIRI(item);

    return item;
}

/**
 * Publish system schema
 * @param item
 * @param messageServer
 * @param type
 */
export async function publishSystemSchema(
    item: SchemaCollection,
    messageServer: MessageServer,
    type?: MessageAction
): Promise<SchemaCollection> {
    item.id = undefined;
    item.readonly = true;
    item.system = false;
    item.active = false;
    item.version = undefined;
    item.topicId = messageServer.getTopic();
    SchemaHelper.setVersion(item, undefined, undefined);
    return await publishSchema(item, '1.0.0', messageServer, type);
}

/**
 * Find and publish schema
 * @param id
 * @param version
 * @param owner
 */
export async function findAndPublishSchema(id: string, version: string, owner: string): Promise<SchemaCollection> {
    let item = await getMongoRepository(SchemaCollection).findOne(id);

    if (!item) {
        throw new Error(`Schema not found: ${id}`);
    }

    if (item.creator !== owner) {
        throw new Error('Invalid owner');
    }

    if (!item.topicId) {
        throw new Error('Invalid topicId');
    }

    if (item.status === SchemaStatus.PUBLISHED) {
        throw new Error('Invalid status');
    }

    const users = new Users();
    const root = await users.getHederaAccount(owner);
    const topic = await getMongoRepository(Topic).findOne({ topicId: item.topicId });
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
        .setTopicObject(topic);

    item = await publishSchema(item, version, messageServer, MessageAction.PublishSchema);

    await getMongoRepository(SchemaCollection).update(item.id, item);

    return item;
}

/**
 * Connect to the message broker methods of working with schemas.
 *
 * @param channel - channel
 * @param schemaRepository - table with schemas
 */
export async function schemaAPI(
    channel: MessageBrokerChannel,
    schemaRepository: MongoRepository<SchemaCollection>
): Promise<void> {

    /**
     * Create schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.CREATE_SCHEMA, async (msg) => {
        try {
            const schemaObject = msg as ISchema;
            console.log('c', schemaObject)
            SchemaHelper.setVersion(schemaObject, null, schemaObject.version);
            await createSchema(schemaObject, schemaObject.owner);
            const schemas = await schemaRepository.find();
            return new MessageResponse(schemas);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Update schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.UPDATE_SCHEMA, async (msg) => {
        try {
            const id = msg.id as string;
            const item = await schemaRepository.findOne(id);
            if (item) {
                item.name = msg.name;
                item.description = msg.description;
                item.entity = msg.entity;
                item.document = msg.document;
                item.status = SchemaStatus.DRAFT;
                SchemaHelper.setVersion(item, null, item.version);
                SchemaHelper.updateIRI(item);
                await schemaRepository.update(item.id, item);
            }
            const schemas = await schemaRepository.find();
            return new MessageResponse(schemas);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schema
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.GET_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }
            if (msg.id) {
                const schema = await schemaRepository.findOne(msg.id);
                return new MessageResponse(schema);
            }
            if (msg.type) {
                const iri = `#${msg.type}`;
                const schema = await schemaRepository.findOne({
                    iri,
                    status: SchemaStatus.PUBLISHED
                });
                return new MessageResponse(schema);
            }
            return new MessageError('Invalid load schema parameter');
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.GET_SCHEMAS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }

            const { owner, uuid, topicId, pageIndex, pageSize } = msg;
            const filter: any = {
                where: {
                    readonly: false,
                    system: false
                }
            }

            if (owner) {
                filter.where.owner = owner;
            }

            if (topicId) {
                filter.where.topicId = topicId;
            }

            if (uuid) {
                filter.where.uuid = uuid;
            }

            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                filter.order = { createDate: 'DESC' };
                filter.take = _pageSize;
                filter.skip = _pageIndex * _pageSize;
            }

            const [schemas, count] = await schemaRepository.findAndCount(filter);

            return new MessageResponse({
                schemas,
                count
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Change the status of a schema on PUBLISHED.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.PUBLISH_SCHEMA, async (msg) => {
        try {
            if (msg) {
                const id = msg.id as string;
                const version = msg.version as string;
                const owner = msg.owner as string;
                const item = await findAndPublishSchema(id, version, owner);
                return new MessageResponse(item);
            } else {
                return new MessageError('Invalid id');
            }
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    /**
     * Delete a schema.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.DELETE_SCHEMA, async (msg) => {
        try {
            if (msg && msg.id) {
                const item = await schemaRepository.findOne(msg.id);
                if (item) {
                    if (item.topicId) {
                        const topic = await getMongoRepository(Topic).findOne({ topicId: item.topicId });
                        if (topic) {
                            const users = new Users();
                            const root = await users.getHederaAccount(item.owner);
                            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
                            const message = new SchemaMessage(MessageAction.DeleteSchema);
                            message.setDocument(item);
                            await messageServer.setTopicObject(topic).sendMessage(message);
                        }
                    }
                    await schemaRepository.delete(item.id);
                }
            }
            const schemas = await schemaRepository.find();
            return new MessageResponse(schemas);
        } catch (error) {
            return new MessageError(error);
        }
    });

    /**
     * Load schema by message identifier
     *
     * @param {string} [payload.messageId] Message identifier
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid import schema parameter');
            }
            const { owner, messageIds, topicId } = msg;
            if (!owner || !messageIds) {
                return new MessageError('Invalid import schema parameter');
            }

            const files: ISchema[] = [];
            for (const messageId of messageIds) {
                const newSchema = await loadSchema(messageId, null);
                files.push(newSchema);
            }

            const schemasMap = await importSchemaByFiles(owner, files, topicId);
            return new MessageResponse(schemasMap);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    /**
     * Load schema by files
     *
     * @param {string} [payload.files] files
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.IMPORT_SCHEMAS_BY_FILE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid import schema parameter');
            }
            const { owner, files, topicId } = msg;
            if (!owner || !files) {
                return new MessageError('Invalid import schema parameter');
            }

            const schemasMap = await importSchemaByFiles(owner, files, topicId);
            return new MessageResponse(schemasMap);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    /**
     * Preview schema by message identifier
     *
     * @param {string} [payload.messageId] Message identifier
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.PREVIEW_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid preview schema parameters');
            }
            const { messageIds } = msg as {
                /**
                 * Message ids
                 */
                messageIds: string[];
            };
            if (!messageIds) {
                return new MessageError('Invalid preview schema parameters');
            }
            const result = [];
            for (const messageId of messageIds) {
                const schema = await loadSchema(messageId, null);
                result.push(schema);
            }

            const messageServer = new MessageServer();
            const uniqueTopics = result.map(res => res.topicId).filter(onlyUnique);
            const anotherSchemas: SchemaMessage[] = [];
            for (const topicId of uniqueTopics) {
                const anotherVersions = await messageServer.getMessages<SchemaMessage>(
                    topicId, MessageType.Schema, MessageAction.PublishSchema
                );
                for (const ver of anotherVersions) {
                    anotherSchemas.push(ver);
                }
            }
            for (const schema of result) {
                if (!schema.version) {
                    continue;
                }

                const newVersions = [];
                const topicMessages = anotherSchemas.filter(item => item.uuid === schema.uuid);
                for (const topicMessage of topicMessages) {
                    if (topicMessage.version &&
                        ModelHelper.versionCompare(topicMessage.version, schema.version) === 1) {
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
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    /**
     * Export schemas
     *
     * @param {Object} payload - filters
     * @param {string[]} payload.ids - schema ids
     *
     * @returns {any} - Response result
     */
    ApiResponse(channel, MessageAPI.EXPORT_SCHEMAS, async (msg) => {
        try {
            const ids = msg as string[];
            const schemas = await schemaRepository.findByIds(ids);
            const map: any = {};
            const relationships: ISchema[] = [];
            for (const schema of schemas) {
                if (!map[schema.iri]) {
                    map[schema.iri] = schema;
                    relationships.push(schema);
                    const keys = getDefs(schema);
                    const defs = await schemaRepository.find({
                        where: { iri: { $in: keys } }
                    });
                    for (const element of defs) {
                        if (!map[element.iri]) {
                            map[element.iri] = element;
                            relationships.push(element);
                        }
                    }
                }
            }
            return new MessageResponse(relationships);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.INCREMENT_SCHEMA_VERSION, async (msg) => {
        try {
            const { owner, iri } = msg as {
                /**
                 * Owner
                 */
                owner: string,
                /**
                 * IRI
                 */
                iri: string
            };
            const schema = await incrementSchemaVersion(iri, owner);
            return new MessageResponse(schema);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Create schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.CREATE_SYSTEM_SCHEMA, async (msg) => {
        try {
            const schemaObject = msg as ISchema;
            SchemaHelper.setVersion(schemaObject, null, null);
            SchemaHelper.updateIRI(schemaObject);
            schemaObject.status = SchemaStatus.DRAFT;
            schemaObject.topicId = null;
            schemaObject.iri = schemaObject.iri || `${schemaObject.uuid}`;
            schemaObject.system = true;
            schemaObject.active = false;
            const item = await getMongoRepository(SchemaCollection).save(schemaObject);
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.GET_SYSTEM_SCHEMAS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }

            const { owner, pageIndex, pageSize } = msg;
            const filter: any = {
                where: {
                    system: true
                }
            }
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                filter.order = { createDate: 'DESC' };
                filter.take = _pageSize;
                filter.skip = _pageIndex * _pageSize;
            }
            console.log(filter);
            const [schemas, count] = await schemaRepository.findAndCount(filter);
            return new MessageResponse({
                schemas,
                count
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Delete a schema.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.ACTIVE_SCHEMA, async (msg) => {
        try {
            if (msg && msg.id) {
                const item = await schemaRepository.findOne(msg.id);
                if (item) {
                    const schemas = await schemaRepository.find({
                        entity: item.entity
                    });
                    for (const schema of schemas) {
                        schema.active = schema.id.toString() === item.id.toString();
                    }
                    await schemaRepository.save(schemas);
                }
            }
            return new MessageResponse(null);
        } catch (error) {
            return new MessageError(error);
        }
    });

    /**
     * Return schema
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(channel, MessageAPI.GET_SYSTEM_SCHEMA, async (msg) => {
        try {
            if (!msg || !msg.entity) {
                return new MessageError('Invalid load schema parameter');
            }
            const schema = await schemaRepository.findOne({
                entity: msg.entity,
                system: true,
                active: true
            });
            return new MessageResponse(schema);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
