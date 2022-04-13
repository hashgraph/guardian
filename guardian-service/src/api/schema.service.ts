import { Schema as SchemaCollection } from '@entity/schema';
import {
    ISchema,
    MessageAPI,
    SchemaEntity,
    SchemaStatus,
    SchemaHelper,
    MessageResponse,
    MessageError,
    ModelHelper,
    TopicType
} from 'interfaces';
import { MongoRepository } from 'typeorm';
import { readJSON } from 'fs-extra';
import path from 'path';
import { schemasToContext } from '@transmute/jsonld-schema';
import { Settings } from '@entity/settings';
import { Logger } from 'logger-helper';
import { HederaSDKHelper, MessageAction, MessageServer, MessageType, SchemaMessage, UrlType } from '@hedera-modules';
import { getMongoRepository } from 'typeorm';
import { replaceValueRecursive } from '@helpers/utils';
import { Users } from '@helpers/users';
import { ApiResponse } from '@api/api-response';
import { Policy } from '@entity/policy';
import { Topic } from '@entity/topic';
import { TopicHelper } from '@helpers/topicHelper';

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

    if (!fileContent.hasOwnProperty('MINT_NFTOKEN')) {
        throw ('You need to fill MINT_NFTOKEN field in system-schemes.json file');
    }

    if (!fileContent.hasOwnProperty('MINT_TOKEN')) {
        throw ('You need to fill MINT_TOKEN field in system-schemes.json file');
    }

    if (!fileContent.hasOwnProperty('POLICY')) {
        throw ('You need to fill POLICY field in system-schemes.json file');
    }

    if (!fileContent.hasOwnProperty('ROOT_AUTHORITY')) {
        throw ('You need to fill ROOT_AUTHORITY field in system-schemes.json file');
    }

    if (!fileContent.hasOwnProperty('WIPE_TOKEN')) {
        throw ('You need to fill WIPE_TOKEN field in system-schemes.json file');
    }

    const messages = Object.values(fileContent);
    const wait = async (timeout: number) => {
        return new Promise(function (resolve, reject) {
            setTimeout(function () { resolve(true) }, timeout);
        });
    }
    const fn = async () => {
        try {
            const existingSchemes = await getMongoRepository(SchemaCollection).find({
                where: {
                    messageId: { $in: messages }
                }
            });
            for (let i = 0; i < messages.length; i++) {
                const messageId = messages[i] as string;
                const existingItem = existingSchemes.find(s => s.messageId === messageId);
                if (existingItem) {
                    console.log(`Skip schema: ${existingItem.messageId}`);
                    continue;
                }
                const schema = await loadSchema(messageId, null) as ISchema;
                schema.owner = null;
                schema.creator = null;
                schema.readonly = true;
                console.log(`Start loading schema: ${messageId}`);
                const item: any = getMongoRepository(SchemaCollection).create(schema);
                await getMongoRepository(SchemaCollection).save(item);
                console.log(`Created schema: ${item.messageId}`);
            }
        } catch (error) {
            await wait(10000);
            await fn();
        }
    }
    await fn();
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
        const document = schema.document;
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

    const schema = await getMongoRepository(SchemaCollection).findOne({ iri: iri });

    if (!schema) {
        throw new Error(`Schema not found: ${iri}`);
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
    const schemaObject = getMongoRepository(SchemaCollection).create(newSchema);

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
        await topicHelper.link(topic, null);
    }

    SchemaHelper.updateIRI(schemaObject);
    schemaObject.status = SchemaStatus.DRAFT;
    schemaObject.topicId = topic.topicId;

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

export async function publishSchema(id: string, version: string, owner: string): Promise<SchemaCollection> {
    const item = await getMongoRepository(SchemaCollection).findOne(id);

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

    SchemaHelper.updateVersion(item, version);

    const itemDocument = item.document;
    const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];
    item.context = schemasToContext([...defsArray, itemDocument]);

    const topic = await getMongoRepository(Topic).findOne({ topicId: item.topicId });

    const users = new Users();
    const root = await users.getHederaAccount(owner);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
    const message = new SchemaMessage(MessageAction.PublishSchema);
    message.setDocument(item);
    const result = await messageServer.setTopicObject(topic).sendMessage(message);

    const messageId = result.getId();
    const contextUrl = result.getDocumentUrl(UrlType.url);
    const documentUrl = result.getContextUrl(UrlType.url);

    item.status = SchemaStatus.PUBLISHED;
    item.documentURL = documentUrl;
    item.contextURL = contextUrl;
    item.messageId = messageId;

    SchemaHelper.updateIRI(item);

    await getMongoRepository(SchemaCollection).update(item.id, item);

    return item;
}

/**
 * Connect to the message broker methods of working with schemes.
 * 
 * @param channel - channel
 * @param schemaRepository - table with schemes
 */
export const schemaAPI = async function (channel: any, schemaRepository): Promise<void> {

    /**
     * Create schema
     * 
     * @param {ISchema} payload - schema
     * 
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.CREATE_SCHEMA, async (msg, res) => {
        try {
            const schemaObject = msg.payload as ISchema;
            console.log('c', schemaObject)
            SchemaHelper.setVersion(schemaObject, null, schemaObject.version);
            await createSchema(schemaObject, schemaObject.owner);
            const schemes = await schemaRepository.find();
            res.send(new MessageResponse(schemes));
        }
        catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
        }
    });

    /**
     * Update schema
     * 
     * @param {ISchema} payload - schema
     * 
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.UPDATE_SCHEMA, async (msg, res) => {
        try {
            const id = msg.payload.id as string;
            const item = await schemaRepository.findOne(id);
            if (item) {
                item.name = msg.payload.name;
                item.description = msg.payload.description;
                item.entity = msg.payload.entity;
                item.document = msg.payload.document;
                item.status = SchemaStatus.DRAFT;
                SchemaHelper.setVersion(item, null, item.version);
                SchemaHelper.updateIRI(item);
                await schemaRepository.update(item.id, item);
            }
            const schemes = await schemaRepository.find();
            res.send(new MessageResponse(schemes));
        }
        catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
        }
    });

    /**
     * Return schema
     * 
     * @param {Object} [payload] - filters
     * 
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.GET_SCHEMA, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Invalid load schema parameter'));
                return;
            }
            const schema = await schemaRepository.findOne(msg.payload.id);
            res.send(new MessageResponse(schema));
        }
        catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
        }
    });

    /**
     * Return schemes
     * 
     * @param {Object} [payload] - filters
     * 
     * @returns {ISchema[]} - all schemes
     */
    ApiResponse(channel, MessageAPI.GET_SCHEMES, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Invalid load schema parameter'));
                return;
            }

            const { owner, uuid, topicId, pageIndex, pageSize } = msg.payload;
            const filter: any = {
                where: {
                    readonly: false
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

            const _pageSize = parseInt(pageSize);
            const _pageIndex = parseInt(pageIndex);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                filter.order = { createDate: "DESC" };
                filter.take = _pageSize;
                filter.skip = _pageIndex * _pageSize;
            }

            const result = await schemaRepository.findAndCount(filter);
            res.send(new MessageResponse({
                schemes: result[0],
                count: result[1]
            }));
        }
        catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
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
    ApiResponse(channel, MessageAPI.PUBLISH_SCHEMA, async (msg, res) => {
        try {
            if (msg.payload) {
                const id = msg.payload.id as string;
                const version = msg.payload.version as string;
                const owner = msg.payload.owner as string;
                const item = await publishSchema(id, version, owner);
                res.send(new MessageResponse(item));
            } else {
                res.send(new MessageError('Invalid id'));
            }
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
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
    ApiResponse(channel, MessageAPI.DELETE_SCHEMA, async (msg, res) => {
        try {
            if (msg.payload) {
                const id = msg.payload as string;
                const item = await schemaRepository.findOne(id);
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
            res.send(new MessageResponse(schemes));
        } catch (error) {
            res.send(new MessageError(error.message));
        }
    });

    /**
     * Load schema by message identifier
     * 
     * @param {string} [payload.messageId] Message identifier
     * 
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.IMPORT_SCHEMES_BY_MESSAGES, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Invalid import schema parameter'));
                return;
            }
            const { owner, messageIds, topicId } = msg.payload;
            if (!owner || !messageIds) {
                res.send(new MessageError('Invalid import schema parameter'));
                return;
            }

            const files: ISchema[] = [];
            for (let i = 0; i < messageIds.length; i++) {
                const messageId = messageIds[i];
                const newSchema = await loadSchema(messageId, null);
                files.push(newSchema);
            }

            const schemesMap = await importSchemaByFiles(owner, files, topicId);
            res.send(new MessageResponse(schemesMap));
        }
        catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
        }
    });

    /**
     * Load schema by files
     * 
     * @param {string} [payload.files] files
     * 
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.IMPORT_SCHEMES_BY_FILE, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Invalid import schema parameter'));
                return;
            }
            const { owner, files, topicId } = msg.payload;
            if (!owner || !files) {
                res.send(new MessageError('Invalid import schema parameter'));
                return;
            }

            const schemesMap = await importSchemaByFiles(owner, files, topicId);
            res.send(new MessageResponse(schemesMap));
        }
        catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
        }
    });

    /**
     * Preview schema by message identifier
     * 
     * @param {string} [payload.messageId] Message identifier
     * 
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(channel, MessageAPI.PREVIEW_SCHEMA, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Invalid preview schema parameters'));
                return;
            }
            const { messageIds } = msg.payload as { messageIds: string[] };
            if (!messageIds) {
                res.send(new MessageError('Invalid preview schema parameters'));
                return;
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
            res.send(new MessageResponse(result));
        }
        catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
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
    ApiResponse(channel, MessageAPI.EXPORT_SCHEMES, async (msg, res) => {
        try {
            const ids = msg.payload as string[];
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
            res.send(new MessageResponse(relationships));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error.message));
        }
    });

    ApiResponse(channel, MessageAPI.INCREMENT_SCHEMA_VERSION, async (msg, res) => {
        try {
            const { owner, iri } = msg.payload as { owner: string, iri: string };
            const schema = await incrementSchemaVersion(iri, owner);
            res.send(new MessageResponse(schema));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error.message));
        }
    });
}
