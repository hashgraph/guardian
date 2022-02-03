import { Schema } from '@entity/schema';
import { ISchema, MessageAPI, SchemaEntity, SchemaStatus, ISchemaSubmitMessage, ModelActionType, SchemaHelper, MessageResponse, MessageError } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { readJSON, writeJSON, readdirSync } from 'fs-extra';
import path from 'path';
import { Blob } from 'buffer';
import { HederaHelper, HederaMirrorNodeHelper } from 'vc-modules';
import { RootConfig } from '@entity/root-config';
import { schemasToContext } from '@transmute/jsonld-schema';
import { IPFS } from '@helpers/ipfs';

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
    const existingSchemes = await schemaRepository.find({ where: { messageId: { $in: messages } } });

    console.log("Load Schemes...");
    for (let i = 0; i < messages.length; i++) {
        const messageId = messages[i] as string;
        const existingItem = existingSchemes.find(s => s.messageId === messageId);
        if (existingItem) {
            console.log("Skip " + existingItem.messageId);
            continue;
        }
        const schema = await loadSchema(messageId, null) as ISchema;
        schema.owner = null;
        schema.creator = null;
        schema.readonly = true;
        console.log("Load " + messageId);
        const item: any = schemaRepository.create(schema);
        await schemaRepository.save(item);
        console.log(`Created schema: ${item.messageId}`);
    }
}

const loadSchema = async function (messageId: string, owner: string) {
    const { topicId, message } = await HederaMirrorNodeHelper.getTopicMessage(messageId);
    const topicMessage = JSON.parse(message) as ISchemaSubmitMessage;
    const documentObject = await IPFS.getFile(topicMessage.document_cid, "str") as string;
    const contextObject = await IPFS.getFile(topicMessage.context_cid, "str") as string;
    const schemaToImport: any = {
        uuid: topicMessage.uuid,
        hash: "",
        name: topicMessage.name,
        description: topicMessage.description,
        entity: topicMessage.entity as SchemaEntity,
        status: SchemaStatus.PUBLISHED,
        readonly: false,
        document: documentObject,
        context: contextObject,
        version: topicMessage.version,
        creator: topicMessage.owner,
        owner: owner,
        topicId: topicId,
        messageId: messageId,
        documentURL: topicMessage.document_url,
        contextURL: topicMessage.context_url,
        iri: null
    }
    updateIRI(schemaToImport);
    return schemaToImport;
}

const updateIRI = function (schema: ISchema) {
    try {
        if (schema.status != SchemaStatus.DRAFT && schema.document) {
            const document = JSON.parse(schema.document);
            schema.iri = document.$id || null;
        } else {
            schema.iri = null;
        }
    } catch (error) {
        schema.iri = null;
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
                item.version = msg.payload.version;
                item.status = SchemaStatus.DRAFT;
                updateIRI(item);
                await schemaRepository.update(item.id, item);
            }
        } else {
            const schemaObject = schemaRepository.create(msg.payload as ISchema);
            schemaObject.status = SchemaStatus.DRAFT;
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
            res.send(new MessageError(error));
        }
    });

    /**
     * Load schema by message identifier
     * 
     * @param {string} [payload.messageId] Message identifier
     * 
     * @returns {Schema} Found or uploaded schema
     */
    channel.response(MessageAPI.IMPORT_SCHEMA, async (msg, res) => {
        try {
            if (!msg.payload || !msg.payload.messageId) {
                res.send(new MessageError('Schema not found'));
                return;
            }

            const messageId = msg.payload.messageId;
            const owner = msg.payload.owner;

            let schema = await schemaRepository.findOne({
                where: { messageId: { $eq: messageId } }
            });

            if (schema) {
                res.send(new MessageResponse(schema));
                return;
            }

            const schemaToImport: any = await loadSchema(messageId, owner);

            schema = schemaRepository.create(schemaToImport) as any;
            await schemaRepository.save(schema);
            res.send(new MessageResponse(schema));
        }
        catch (error) {
            res.send(new MessageError(error));
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
            if (!msg.payload || !msg.payload.messageId) {
                res.send(new MessageError('Schema not found'));
                return;
            }

            const messageId = msg.payload.messageId;
            const owner = msg.payload.owner;

            let schema = await schemaRepository.findOne({
                where: { messageId: { $eq: messageId } }
            });

            if (schema) {
                res.send(new MessageResponse(schema));
                return;
            }

            const schemaToImport: any = await loadSchema(messageId, owner);
            res.send(new MessageResponse(schemaToImport));
        }
        catch (error) {
            res.send(new MessageResponse(error));
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
        if (msg.payload && msg.payload.uuid) {
            const schemes = await schemaRepository.find({
                where: { uuid: { $eq: msg.payload.uuid } }
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

                const messageId = await HederaHelper
                    .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
                    .submitMessage(process.env.SCHEMA_TOPIC_ID, JSON.stringify(schemaPublishMessage));

                item.messageId = messageId;

                updateIRI(item);
                await schemaRepository.update(item.id, item);

                res.send(new MessageResponse(item));
                return;
            }
            res.send(new MessageError("Invalid id"));
        } catch (error) {
            console.error(error);
            res.send(new MessageError(error));
        }
    });

    /**
     * Change the status of a schema on UNPUBLISHED.
     * 
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id 
     * 
     * @returns {ISchema[]} - all schemes
     */
    channel.response(MessageAPI.UNPUBLISHED_SCHEMA, async (msg, res) => {
        if (msg.payload) {
            const id = msg.payload as string;
            const item = await schemaRepository.findOne(id);
            if (item) {
                item.status = SchemaStatus.UNPUBLISHED;
                updateIRI(item);
                await schemaRepository.update(item.id, item);
            }
        }
        const schemes = await schemaRepository.find();
        res.send(new MessageResponse(schemes));
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
        if (msg.payload) {
            const id = msg.payload as string;
            const item = await schemaRepository.findOne(id);
            if (item) {
                await schemaRepository.delete(item.id);
            }
        }
        const schemes = await schemaRepository.find();
        res.send(new MessageResponse(schemes));
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
            const notExported = schemas.filter(schema => !schema.messageId);
            if (notExported.length > 0) {
                throw new Error(`Cannot export schemas: ${notExported.map(schema => `${schema.name}`).join(', ')}`);
            }

            const schemasToExport = schemas.map(schema => {
                return {
                    name: schema.name,
                    version: schema.version,
                    messageId: schema.messageId
                }
            });
            res.send(new MessageResponse({ body: schemasToExport }));
        } catch (error) {
            res.send(new MessageError(error));
        }
    });
}