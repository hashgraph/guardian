import { Schema as SchemaCollection } from '@entity/schema';
import { Topic } from '@entity/topic';
import {
    ISchema,
    MessageAPI,
    SchemaEntity,
    SchemaStatus,
    TopicType,
    SchemaHelper,
    ModelHelper,
} from '@guardian/interfaces';
import path from 'path';
import { readJSON } from 'fs-extra';
import { getMongoRepository, MongoRepository } from 'typeorm';
import { schemasToContext } from '@transmute/jsonld-schema';
import { Logger } from '@guardian/logger-helper';
import { MessageAction, MessageServer, MessageType, SchemaMessage, UrlType } from '@hedera-modules';
import { replaceValueRecursive } from '@helpers/utils';
import { Users } from '@helpers/users';
import { ApiResponse } from '@api/api-response';
import { TopicHelper } from '@helpers/topicHelper';
import { MessageBrokerChannel, MessageResponse, MessageError } from '@guardian/common';

export const schemaCache = {};

/**
 * Creation of default schemes.
 *
 * @param schemaRepository - table with schemes
 */
export async function setDefaultSchema() {
    const fileConfig = path.join(process.cwd(), 'system-schemes', 'system-schemes.json');
    let fileContent: any;
    try {
        fileContent = await readJSON(fileConfig);
    } catch (error) {
        throw ('you need to create a file \'system-schemes.json\'');
    }

    const map: any = {};
    for (const schema of fileContent) {
        map[schema.entity] = schema;
    }

    if (!map.hasOwnProperty('MINT_NFTOKEN')) {
        throw ('You need to fill MINT_NFTOKEN field in system-schemes.json file');
    }

    if (!map.hasOwnProperty('MINT_TOKEN')) {
        throw ('You need to fill MINT_TOKEN field in system-schemes.json file');
    }

    if (!map.hasOwnProperty('POLICY')) {
        throw ('You need to fill POLICY field in system-schemes.json file');
    }

    if (!map.hasOwnProperty('ROOT_AUTHORITY')) {
        throw ('You need to fill ROOT_AUTHORITY field in system-schemes.json file');
    }

    if (!map.hasOwnProperty('WIPE_TOKEN')) {
        throw ('You need to fill WIPE_TOKEN field in system-schemes.json file');
    }

    const fn = async (schema: any) => {
        const existingSchemes = await getMongoRepository(SchemaCollection).findOne({ uuid: schema.uuid });
        if (existingSchemes) {
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

    await fn(map['MINT_NFTOKEN']);
    await fn(map['MINT_TOKEN']);
    await fn(map['POLICY']);
    await fn(map['ROOT_AUTHORITY']);
    await fn(map['WIPE_TOKEN']);
}

const loadSchema = async function (messageId: string, owner: string) {
    const log = new Logger();
    try {
        if (schemaCache[messageId]) {
            return schemaCache[messageId];
        }
        const messageServer = new MessageServer();
        log.info(`loadSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
        const message = await messageServer.getMessage<SchemaMessage>(messageId);
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
            owner: owner,
            topicId: message.getTopicId(),
            messageId: messageId,
            documentURL: message.getDocumentUrl(UrlType.url),
            contextURL: message.getContextUrl(UrlType.url),
            iri: null
        }
        SchemaHelper.updateIRI(schemaToImport);
        log.info(`loadSchema end: ${messageId}`, ['GUARDIAN_SERVICE']);
        schemaCache[messageId] = { ...schemaToImport };
        return schemaToImport;
    } catch (error) {
        log.error(error.message, ['GUARDIAN_SERVICE']);
        console.error(error.message);
        throw new Error(`Cannot load schema ${messageId}`);
    }
}

const getDefs = function (schema: ISchema) {
    try {
        let document: any = schema.document;
        if (typeof document == "string") {
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

const onlyUnique = function (value: any, index: any, self: any): boolean {
    return self.indexOf(value) === index;
}

export async function incrementSchemaVersion(iri: string, owner: string): Promise<SchemaCollection> {
    if (!owner || !iri) {
        throw new Error(`Invalid increment schema version parameter`);
    }

    const schema = await getMongoRepository(SchemaCollection).findOne({ iri, owner });

    if (!schema) {
        throw new Error(`Schema not found: ${iri} for owner ${owner}`);
    }

    if (schema.status == SchemaStatus.PUBLISHED) {
        return schema;
    }

    const { version, previousVersion } = SchemaHelper.getVersion(schema);
    let newVersion = '1.0.0';
    if (previousVersion) {
        const schemes = await getMongoRepository(SchemaCollection).find({ uuid: schema.uuid });
        const versions = [];
        for (let i = 0; i < schemes.length; i++) {
            const element = schemes[i];
            const { version, previousVersion } = SchemaHelper.getVersion(element);
            versions.push(version, previousVersion);
        }
        newVersion = SchemaHelper.incrementVersion(previousVersion, versions);
    }
    schema.version = newVersion;

    return schema;
}

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
            owner: owner,
            policyId: null,
            policyUUID: null
        });
        await topicHelper.link(topic, null, null);
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

export async function importSchemaByFiles(owner: string, files: ISchema[], topicId: string) {
    const uuidMap: Map<string, string> = new Map();
    for (let i = 0; i < files.length; i++) {
        const file = files[i] as ISchema;
        const newUUID = ModelHelper.randomUUID();
        const uuid = file.iri ? file.iri.substring(1) : null;
        if (uuid) {
            uuidMap.set(uuid, newUUID);
        }
        file.uuid = newUUID;
        file.iri = '#' + newUUID;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
    const schemesMap = [];
    uuidMap.forEach((v, k) => {
        schemesMap.push({
            oldUUID: k,
            newUUID: v,
            oldIRI: `#${k}`,
            newIRI: `#${v}`
        })
    });
    return schemesMap;
}

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
    const contextUrl = result.getDocumentUrl(UrlType.url);
    const documentUrl = result.getContextUrl(UrlType.url);

    item.status = SchemaStatus.PUBLISHED;
    item.documentURL = documentUrl;
    item.contextURL = contextUrl;
    item.messageId = messageId;

    SchemaHelper.updateIRI(item);

    return item;
}

export async function findAndPublishSchema(id: string, version: string, owner: string): Promise<SchemaCollection> {
    let item = await getMongoRepository(SchemaCollection).findOne(id);

    if (!item) {
        throw new Error(`Schema not found: ${id}`);
    }

    if (item.creator != owner) {
        throw new Error('Invalid owner');
    }

    if (!item.topicId) {
        throw new Error('Invalid topicId');
    }

    if (item.status == SchemaStatus.PUBLISHED) {
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
 * Connect to the message broker methods of working with schemes.
 *
 * @param channel - channel
 * @param schemaRepository - table with schemes
 */
export const schemaAPI = async function (
    channel: MessageBrokerChannel,
    schemaRepository: MongoRepository<SchemaCollection>
): Promise<void> {

    /**
     * Create schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.CREATE_SCHEMA, async (msg) => {
        try {
            const schemaObject = msg as ISchema;
            console.log('c', schemaObject)
            SchemaHelper.setVersion(schemaObject, null, schemaObject.version);
            await createSchema(schemaObject, schemaObject.owner);
            const schemes = await schemaRepository.find();
            return new MessageResponse(schemes);
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Update schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemes
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
            const schemes = await schemaRepository.find();
            return new MessageResponse(schemes);
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schema
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemes
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
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemes
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.GET_SCHEMES, async (msg) => {
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

            const [schemes, count] = await schemaRepository.findAndCount(filter);

            return new MessageResponse({
                schemes,
                count
            });
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Change the status of a schema on PUBLISHED.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemes
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
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error.message);
        }
    });

    /**
     * Delete a schema.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemes
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
            const schemes = await schemaRepository.find();
            return new MessageResponse(schemes);
        } catch (error) {
            return new MessageError(error.message);
        }
    });

    /**
     * Load schema by message identifier
     *
     * @param {string} [payload.messageId] Message identifier
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.IMPORT_SCHEMES_BY_MESSAGES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid import schema parameter');
            }
            const { owner, messageIds, topicId } = msg;
            if (!owner || !messageIds) {
                return new MessageError('Invalid import schema parameter');
            }

            const files: ISchema[] = [];
            for (let i = 0; i < messageIds.length; i++) {
                const messageId = messageIds[i];
                const newSchema = await loadSchema(messageId, null);
                files.push(newSchema);
            }

            const schemesMap = await importSchemaByFiles(owner, files, topicId);
            return new MessageResponse(schemesMap);
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error.message);
        }
    });

    /**
     * Load schema by files
     *
     * @param {string} [payload.files] files
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.IMPORT_SCHEMES_BY_FILE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid import schema parameter');
            }
            const { owner, files, topicId } = msg;
            if (!owner || !files) {
                return new MessageError('Invalid import schema parameter');
            }

            const schemesMap = await importSchemaByFiles(owner, files, topicId);
            return new MessageResponse(schemesMap);
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error.message);
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
            const { messageIds } = msg as { messageIds: string[] };
            if (!messageIds) {
                return new MessageError('Invalid preview schema parameters');
            }
            const result = [];
            for (let i = 0; i < messageIds.length; i++) {
                const messageId = messageIds[i];
                const schema = await loadSchema(messageId, null);
                result.push(schema);
            }

            const messageServer = new MessageServer();
            const uniqueTopics = result.map(res => res.topicId).filter(onlyUnique);
            const anotherSchemas: SchemaMessage[] = [];
            for (let i = 0; i < uniqueTopics.length; i++) {
                const topicId = uniqueTopics[i];
                const anotherVersions = await messageServer.getMessages<SchemaMessage>(
                    topicId, MessageType.Schema, MessageAction.PublishSchema
                );
                for (let j = 0; j < anotherVersions.length; j++) {
                    anotherSchemas.push(anotherVersions[j]);
                }
            }
            for (let i = 0; i < result.length; i++) {
                const schema = result[i];
                if (!schema.version) {
                    continue;
                }

                const newVersions = [];
                const topicMessages = anotherSchemas.filter(item => item.uuid === schema.uuid);
                for (let j = 0; j < topicMessages.length; j++) {
                    const topicMessage = topicMessages[j];
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
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error.message);
        }
    });

    /**
     * Export schemes
     *
     * @param {Object} payload - filters
     * @param {string[]} payload.ids - schema ids
     *
     * @returns {any} - Response result
     */
    ApiResponse(channel, MessageAPI.EXPORT_SCHEMES, async (msg) => {
        try {
            const ids = msg as string[];
            const schemas = await schemaRepository.findByIds(ids);
            const map: any = {};
            const relationships: ISchema[] = [];
            for (let index = 0; index < schemas.length; index++) {
                const schema = schemas[index];
                if (!map[schema.iri]) {
                    map[schema.iri] = schema;
                    relationships.push(schema);
                    const keys = getDefs(schema);
                    const defs = await schemaRepository.find({
                        where: { iri: { $in: keys } }
                    });
                    for (let j = 0; j < defs.length; j++) {
                        const element = defs[j];
                        if (!map[element.iri]) {
                            map[element.iri] = element;
                            relationships.push(element);
                        }
                    }
                }
            }
            return new MessageResponse(relationships);
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error.message);
        }
    });

    ApiResponse(channel, MessageAPI.INCREMENT_SCHEMA_VERSION, async (msg) => {
        try {
            const { owner, iri } = msg as { owner: string, iri: string };
            const schema = await incrementSchemaVersion(iri, owner);
            return new MessageResponse(schema);
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error.message);
        }
    });

    /**
     * Create schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemes
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
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemes
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.GET_SYSTEM_SCHEMES, async (msg) => {
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
            const [schemes, count] = await schemaRepository.findAndCount(filter);
            return new MessageResponse({
                schemes,
                count
            });
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });


    /**
     * Delete a schema.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.ACTIVE_SCHEMA, async (msg) => {
        try {
            if (msg && msg.id) {
                const item = await schemaRepository.findOne(msg.id);
                if (item) {
                    const schemes = await schemaRepository.find({
                        entity: item.entity
                    });
                    for (const schema of schemes) {
                        schema.active = schema.id.toString() == item.id.toString();
                    }
                    await schemaRepository.save(schemes);
                }
            }
            return new MessageResponse(null);
        } catch (error) {
            return new MessageError(error.message);
        }
    });

    /**
     * Return schema
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemes
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
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
