import { Schema } from '@entity/schema';
import { RootConfig } from '@entity/root-config';
import {
    ISchema,
    MessageAPI,
    SchemaEntity,
    SchemaStatus,
    SchemaHelper,
    MessageResponse,
    MessageError,
    ModelHelper
} from 'interfaces';
import {
    HederaHelper,
    HederaMirrorNodeHelper,
    HederaSenderHelper,
    ISchemaSubmitMessage,
    ModelActionType
} from 'vc-modules';
import { MongoRepository } from 'typeorm';
import { readJSON } from 'fs-extra';
import path from 'path';
import { Blob } from 'buffer';
import { schemasToContext } from '@transmute/jsonld-schema';
import { IPFS } from '@helpers/ipfs';
import { Settings } from '@entity/settings';
import { Logger } from 'logger-helper';

export const schemaCache = {};

/**
 * Creation of default schemes.
 * 
 * @param schemaRepository - table with schemes
 */
export const setDefaultSchema = async function (schemaRepository: MongoRepository<Schema>) {
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
            const existingSchemes = await schemaRepository.find({ where: { messageId: { $in: messages } } });
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
                const item: any = schemaRepository.create(schema);
                await schemaRepository.save(item);
                console.log(`Created schema: ${item.messageId}`);
            }
        } catch (error) {
            console.error('ERROR: Unable to access ipfs');
            await wait(10000);
            await fn();
        }
    }
    await fn();
}

const loadSchema = async function (messageId: string, owner: string) {
    try {
        if (schemaCache[messageId]) {
            return schemaCache[messageId];
        }
        console.log("loadSchema: " + messageId);
        const { topicId, message } = await HederaMirrorNodeHelper.getSchemaTopicMessage(messageId);
        console.log("loadSchema message");
        console.log("loadSchema ipfs " + message.document_cid);
        const documentObject = await IPFS.getFile(message.document_cid, "str") as string;
        console.log("loadSchema ipfs " + message.context_cid);
        const contextObject = await IPFS.getFile(message.context_cid, "str") as string;
        console.log("loadSchema files");
        const schemaToImport: any = {
            uuid: message.uuid,
            hash: "",
            name: message.name,
            description: message.description,
            entity: message.entity as SchemaEntity,
            status: SchemaStatus.PUBLISHED,
            readonly: false,
            document: documentObject,
            context: contextObject,
            version: message.version,
            creator: message.owner,
            owner: owner,
            topicId: topicId,
            messageId: messageId,
            documentURL: message.document_url,
            contextURL: message.context_url,
            iri: null
        }
        updateIRI(schemaToImport);
        console.log("loadSchema end: " + messageId);
        schemaCache[messageId] = { ...schemaToImport };
        return schemaToImport;
    } catch (error) {
        throw new Error(`Cannot load schema ${messageId}`);
    }
}

const updateIRI = function (schema: ISchema) {
    try {
        if (schema.document) {
            const document = JSON.parse(schema.document);
            schema.iri = document.$id || null;
        } else {
            schema.iri = null;
        }
    } catch (error) {
        schema.iri = null;
    }
}

const getDefs = function (schema: ISchema) {
    try {
        const document = JSON.parse(schema.document);
        if (!document.$defs) {
            return [];
        }
        return Object.keys(document.$defs);
    } catch (error) {
        return [];
    }
}

/**
 * Connect to the message broker methods of working with schemes.
 * 
 * @param channel - channel
 * @param schemaRepository - table with schemes
 */
export const schemaAPI = async function (
    channel: any,
    schemaRepository: MongoRepository<Schema>,
    configRepository: MongoRepository<RootConfig>,
    settingsRepository: MongoRepository<Settings>,
): Promise<void> {
    /**
     * Create or update schema
     * 
     * @param {ISchema} payload - schema
     * 
     * @returns {ISchema[]} - all schemes
     */
    channel.response(MessageAPI.SET_SCHEMA, async (msg, res) => {
        if (msg.payload.id) {
            const id = msg.payload.id as string;
            const item = await schemaRepository.findOne(id);
            if (item) {
                item.name = msg.payload.name;
                item.description = msg.payload.description;
                item.entity = msg.payload.entity;
                item.document = msg.payload.document;
                item.status = SchemaStatus.DRAFT;
                SchemaHelper.setVersion(item, null, item.version);
                updateIRI(item);
                await schemaRepository.update(item.id, item);
            }
        } else {
            const schemaObject = schemaRepository.create(msg.payload as ISchema);
            schemaObject.status = SchemaStatus.DRAFT;
            SchemaHelper.setVersion(schemaObject, null, schemaObject.version);
            updateIRI(schemaObject);
            await schemaRepository.save(schemaObject);
        }
        const schemes = await schemaRepository.find();
        res.send(new MessageResponse(schemes));
    });

    /**
     * Return schemes
     * 
     * @param {Object} [payload] - filters
     * @param {string} [payload.type] - schema type 
     * @param {string} [payload.entity] - schema entity type
     * 
     * @returns {ISchema[]} - all schemes
     */
    channel.response(MessageAPI.GET_SCHEMA, async (msg, res) => {
        try {
            if (msg.payload) {
                if (msg.payload.id) {
                    const schema = await schemaRepository.findOne(msg.payload.id);
                    res.send(new MessageResponse(schema));
                    return;
                }
                if (msg.payload.messageId) {
                    const schema = await schemaRepository.findOne({
                        where: { messageId: { $eq: msg.payload.messageId } }
                    });
                    res.send(new MessageResponse(schema));
                    return;
                }
                if (msg.payload.iri) {
                    const schema = await schemaRepository.findOne({
                        where: { iri: { $eq: msg.payload.iri } }
                    });
                    res.send(new MessageResponse(schema));
                    return;
                }
                if (msg.payload.entity) {
                    const schema = await schemaRepository.findOne({
                        where: { entity: { $eq: msg.payload.entity } }
                    });
                    res.send(new MessageResponse(schema));
                    return;
                }
            }
            res.send(new MessageError('Schema not found'));
        }
        catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
        }
    });

    /**
     * Return schemes
     * 
     * @param {Object} [payload] - filters
     * @param {string} [payload.type] - schema type 
     * @param {string} [payload.entity] - schema entity type
     * 
     * @returns {ISchema[]} - all schemes
     */
    channel.response(MessageAPI.GET_SCHEMES, async (msg, res) => {
        if (msg.payload && msg.payload.uuid) {
            const schemes = await schemaRepository.find({
                where: { uuid: { $eq: msg.payload.uuid } }
            });
            res.send(new MessageResponse(schemes));
            return;
        }
        if (msg.payload && msg.payload.iris) {
            const schemes = await schemaRepository.find({
                where: { iri: { $in: msg.payload.iris } }
            });
            if (msg.payload.includes) {
                const defs: any[] = schemes.map(s => JSON.parse(s.document).$defs);
                const map: any = {};
                for (let i = 0; i < schemes.length; i++) {
                    const id = schemes[i].iri;
                    map[id] = id;
                }
                for (let i = 0; i < defs.length; i++) {
                    if (defs[i]) {
                        const ids = Object.keys(defs[i]);
                        for (let j = 0; j < ids.length; j++) {
                            const id = ids[j];
                            map[id] = id;
                        }
                    }
                }
                const allSchemesIds = Object.keys(map);
                const allSchemes = await schemaRepository.find({
                    where: { iri: { $in: allSchemesIds } }
                });
                res.send(new MessageResponse(allSchemes));
                return;
            }
            res.send(new MessageResponse(schemes));
            return;
        }
        if (msg.payload && msg.payload.owner) {
            const schemes = await schemaRepository.find({
                where: {
                    $or: [
                        {
                            status: { $eq: SchemaStatus.PUBLISHED },
                        },
                        {
                            owner: { $eq: msg.payload.owner }
                        },
                    ]
                }
            });
            res.send(new MessageResponse(schemes));
            return;
        }
        const schemes = await schemaRepository.find({
            where: { status: { $eq: SchemaStatus.PUBLISHED } }
        });
        res.send(new MessageResponse(schemes));
    });

    /**
     * Load schema by message identifier
     * 
     * @param {string} [payload.messageId] Message identifier
     * 
     * @returns {Schema} Found or uploaded schema
     */
    channel.response(MessageAPI.IMPORT_SCHEMES_BY_MESSAGES, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Schema not found'));
                return;
            }
            const { owner, messageIds } = msg.payload as { owner: string, messageIds: string[] };
            if (!owner || !messageIds) {
                res.send(new MessageError('Schema not found'));
                return;
            }

            const files: any[] = [];
            for (let i = 0; i < messageIds.length; i++) {
                const messageId = messageIds[i];
                const newSchema = await loadSchema(messageId, null);
                files.push(newSchema);
            }

            const result: any = {};
            for (let i = 0; i < files.length; i++) {
                const file = files[i] as ISchema;
                const newUUID = ModelHelper.randomUUID();
                const uuid = file.iri ? file.iri.substring(1) : null;
                if (uuid) {
                    result[uuid] = newUUID;
                }
                file.uuid = newUUID;
                file.iri = '#' + newUUID;
            }

            const uuids = Object.keys(result);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                file.document = file.document || '';
                file.context = file.context || '';
                for (let j = 0; j < uuids.length; j++) {
                    const uuid = uuids[j];
                    file.document = file.document.replace(new RegExp(uuid, 'g'), result[uuid]);
                    file.context = file.context.replace(new RegExp(uuid, 'g'), result[uuid]);
                }
                file.messageId = null;
                file.creator = owner;
                file.owner = owner;
                file.status = SchemaStatus.DRAFT;
                SchemaHelper.setVersion(file, '', '');
                const schema = schemaRepository.create(file);
                await schemaRepository.save(schema);
            }

            const schemesMap = [];
            for (let j = 0; j < uuids.length; j++) {
                const uuid = uuids[j];
                schemesMap.push({
                    oldUUID: uuid,
                    newUUID: result[uuid],
                    oldIRI: `#${uuid}`,
                    newIRI: `#${result[uuid]}`
                })
            }
            res.send(new MessageResponse(schemesMap));
        }
        catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
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
    channel.response(MessageAPI.IMPORT_SCHEMES_BY_FILE, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Schema not found'));
                return;
            }
            const { owner, files } = msg.payload as { owner: string, files: ISchema[] };
            if (!owner || !files) {
                res.send(new MessageError('Schema not found'));
                return;
            }

            const result: any = {};
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const newUUID = ModelHelper.randomUUID();
                const uuid = file.iri ? file.iri.substring(1) : null;
                if (uuid) {
                    result[uuid] = newUUID;
                }
                file.uuid = newUUID;
                file.iri = '#' + newUUID;
            }

            const uuids = Object.keys(result);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                for (let j = 0; j < uuids.length; j++) {
                    const uuid = uuids[j];
                    file.document = file.document.replace(new RegExp(uuid, 'g'), result[uuid]);
                    file.context = file.context.replace(new RegExp(uuid, 'g'), result[uuid]);
                }
                file.messageId = null;
                file.creator = owner;
                file.owner = owner;
                file.status = SchemaStatus.DRAFT;
                SchemaHelper.setVersion(file, '', '');
                const schema = schemaRepository.create(file);
                await schemaRepository.save(schema);
            }

            const schemesMap = [];
            for (let j = 0; j < uuids.length; j++) {
                const uuid = uuids[j];
                schemesMap.push({
                    oldUUID: uuid,
                    newUUID: result[uuid],
                    oldIRI: `#${uuid}`,
                    newIRI: `#${result[uuid]}`
                })
            }
            res.send(new MessageResponse(schemesMap));
        }
        catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
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
    channel.response(MessageAPI.PREVIEW_SCHEMA, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(new MessageError('Schema not found'));
                return;
            }
            const { messageIds } = msg.payload as { messageIds: string[] };
            if (!messageIds) {
                res.send(new MessageError('Schema not found'));
                return;
            }
            const result = [];
            for (let i = 0; i < messageIds.length; i++) {
                const messageId = messageIds[i];
                const schema = await loadSchema(messageId, null);
                result.push(schema);
            }

            function onlyUnique(value, index, self) {
                return self.indexOf(value) === index;
            }

            const topics = result.map(res => res.topicId).filter(onlyUnique);
            let anotherSchemas = [];

            for (let i = 0; i < topics.length; i++) {
                const topicId = topics[i];
                anotherSchemas.push({
                    topicId,
                    messages: await HederaMirrorNodeHelper.getTopicMessages(topicId)
                })
            }

            for (let i = 0; i < result.length; i++) {
                const schema = result[i];
                if (!schema.version) {
                    continue;
                }

                const newVersions = [];
                const topicMessages = anotherSchemas.find(item => item.topicId === schema.topicId);
                topicMessages?.messages?.forEach(anotherSchema => {
                    if (anotherSchema.message
                        && anotherSchema.message.uuid === schema.uuid
                        && anotherSchema.message.version
                        && ModelHelper.versionCompare(anotherSchema.message.version, schema.version) === 1) {
                        newVersions.push({
                            messageId: anotherSchema.timeStamp,
                            version: anotherSchema.message.version
                        });
                    }
                });
                if (newVersions && newVersions.length !== 0) {
                    schema.newVersions = newVersions.reverse();
                }
            }

            res.send(new MessageResponse(result));
        }
        catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
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
    channel.response(MessageAPI.PUBLISH_SCHEMA, async (msg, res) => {
        try {
            if (msg.payload) {
                const id = msg.payload.id as string;
                const version = msg.payload.version as string;
                const owner = msg.payload.owner as string;

                const item = await schemaRepository.findOne(id);

                if (!item) {
                    res.send(new MessageError("Schema not found"));
                    return;
                }

                if (item.creator != owner) {
                    res.send(new MessageError("Invalid owner"));
                    return;
                }

                if (item.status == SchemaStatus.PUBLISHED) {
                    res.send(new MessageError("Invalid status"));
                    return;
                }

                SchemaHelper.updateVersion(item, version);

                const itemDocument = JSON.parse(item.document);
                const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];
                item.context = JSON.stringify(schemasToContext([...defsArray, itemDocument]));

                const document = item.document;
                const context = item.context;

                const documentFile = new Blob([document], { type: "application/json" });
                const contextFile = new Blob([context], { type: "application/json" });
                let result: any;
                result = await IPFS.addFile(await documentFile.arrayBuffer());
                const documentCid = result.cid;
                const documentUrl = result.url;
                result = await IPFS.addFile(await contextFile.arrayBuffer());
                const contextCid = result.cid;
                const contextUrl = result.url;

                item.status = SchemaStatus.PUBLISHED;
                item.documentURL = documentUrl;
                item.contextURL = contextUrl;

                const schemaPublishMessage: ISchemaSubmitMessage = {
                    name: item.name,
                    description: item.description,
                    entity: item.entity,
                    owner: item.creator,
                    uuid: item.uuid,
                    version: item.version,
                    operation: ModelActionType.PUBLISH,
                    document_cid: documentCid,
                    document_url: documentUrl,
                    context_cid: contextCid,
                    context_url: contextUrl
                }

                const root = await configRepository.findOne({ where: { did: { $eq: owner } } });
                if (!root) {
                    res.send(new MessageError("Root not found"));
                    return;
                }

                const hederaHelper = HederaHelper
                    .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK;
                const schemaTopicId = await settingsRepository.findOne({
                    name: 'SCHEMA_TOPIC_ID'
                })
                const messageId = await HederaSenderHelper.SubmitSchemaMessage(hederaHelper, schemaTopicId?.value || process.env.SCHEMA_TOPIC_ID, schemaPublishMessage);

                item.messageId = messageId;

                updateIRI(item);
                await schemaRepository.update(item.id, item);

                res.send(new MessageResponse(item));
                return;
            }
            res.send(new MessageError("Invalid id"));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
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
    channel.response(MessageAPI.DELETE_SCHEMA, async (msg, res) => {
        try {
            if (msg.payload) {
                const id = msg.payload as string;
                const item = await schemaRepository.findOne(id);
                if (item) {
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
     * Export schemes
     * 
     * @param {Object} payload - filters
     * @param {string[]} payload.ids - schema ids
     * 
     * @returns {any} - Response result
     */
    channel.response(MessageAPI.EXPORT_SCHEMES, async (msg, res) => {
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
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error.message));
        }
    });

    channel.response(MessageAPI.INCREMENT_SCHEMA_VERSION, async (msg, res) => {
        try {
            const { owner, iri } = msg.payload as { owner: string, iri: string };
            if (!owner || !iri) {
                res.send(new MessageError('Schema not found'));
                return;
            }
            const schema = await schemaRepository.findOne({
                where: { iri: { $eq: iri } }
            });

            if (!schema) {
                res.send(new MessageError('Schema not found'));
                return;
            }

            if (schema.status == SchemaStatus.PUBLISHED) {
                res.send(new MessageResponse(schema));
                return;
            }

            const { version, previousVersion } = SchemaHelper.getVersion(schema);
            let newVersion = '1.0.0';
            if (previousVersion) {
                const schemes = await schemaRepository.find({
                    where: { uuid: { $eq: schema.uuid } }
                });
                const versions = [];
                for (let i = 0; i < schemes.length; i++) {
                    const element = schemes[i];
                    const { version, previousVersion } = SchemaHelper.getVersion(element);
                    versions.push(version, previousVersion);
                }
                newVersion = SchemaHelper.incrementVersion(previousVersion, versions);
            }
            schema.version = newVersion;
            res.send(new MessageResponse(schema));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error.message));
        }
    });

}