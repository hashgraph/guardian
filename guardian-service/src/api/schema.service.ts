import { Schema } from '@entity/schema';
import { ISchema, MessageAPI, SchemaEntity, SchemaStatus, Schema as SchemaModel, ISchemaSubmitMessage, ModelActionType, SchemaHelper } from 'interfaces';
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
    let fileName: string;
    const schemes = [];
    const files = readdirSync(path.join(process.cwd(), 'system-schemes'));

    try {
        for (let i = 0; i < files.length; i++) {
            fileName = files[i];
            const schema = await readJSON(path.join(process.cwd(), 'system-schemes', fileName));
            schemes.push(schema);
        }
    } catch (error) {
        console.error(error);
        throw (`Unable to read the file: system-schemes/${fileName}`);
    }

    const ids = schemes.map(s => s.uuid);
    const existingSchemes = await schemaRepository.find({ where: { uuid: { $in: ids } } });
    for (let i = 0; i < schemes.length; i++) {
        const schema = schemes[i];
        schema.readonly = true;
        schema.status = SchemaStatus.PUBLISHED;
        updateIRI(schema);
        const item: any = schemaRepository.create(schema);
        const existingItem = existingSchemes.find(s => s.uuid === schema.uuid);
        if (existingItem) {
            await schemaRepository.update(existingItem.id, item);
            console.log(`Updated schema: ${item.uuid}`);
        } else {
            await schemaRepository.save(item);
            console.log(`Created schema: ${item.uuid}`);
        }
    }
}

const getRelationships = function (schema: SchemaModel) {
    const fields = schema.fields;
    const result = [];
    for (let i = 0; i < fields.length; i++) {
        const element = fields[i];
        if (element.isRef) {
            result.push(element.type);
        }
    }
    return result;
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

const updateIRIs = function (schemes: ISchema[]) {
    if (schemes) {
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            updateIRI(schema);
        }
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
        res.send(schemes);
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
                    res.send(schema);
                    return;
                }
                if (msg.payload.messageId) {
                    const schema = await schemaRepository.findOne({
                        where: { messageId: { $eq: msg.payload.messageId } }
                    });
                    res.send(schema);
                    return;
                }
            }
            res.send(null);
        }
        catch (error) {
            res.send(null);
        }
    });

    /**
     * Load schema by message identifier
     * 
     * @param {string} [payload.messageId] Message identifier
     * 
     * @returns {Schema} Found or uploaded schema
     */
    channel.response(MessageAPI.LOAD_SCHEMA, async (msg, res) => {
        try {
            if (!msg.payload || !msg.payload.messageId) {
                res.send(null);
                return;
            }

            const messageId = msg.payload.messageId;
            const owner = msg.payload.owner;

            let schema = await schemaRepository.findOne({
                where: { messageId: { $eq: messageId } }
            });

            if (schema) {
                res.send(schema);
                return;
            }

            const schemaToImport: any = await loadSchema(messageId, owner);

            schema = schemaRepository.create(schemaToImport) as any;
            await schemaRepository.save(schema);
            res.send(schema);
        }
        catch (error) {
            res.send(null);
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
                res.send(null);
                return;
            }

            const messageId = msg.payload.messageId;
            const owner = msg.payload.owner;

            let schema = await schemaRepository.findOne({
                where: { messageId: { $eq: messageId } }
            });

            if (schema) {
                res.send(null);
                return;
            }

            const schemaToImport: any = await loadSchema(messageId, owner);
            res.send(schemaToImport);
        }
        catch (error) {
            res.send(null);
        }
    });

    /**
     * Load schema document
     * @param {string} [payload.url] Document URL
     * 
     * @returns Schema document
     */
    channel.response(MessageAPI.LOAD_SCHEMA_DOCUMENT, async (msg, res) => {
        try {
            if (!msg.payload || !msg.payload.url) {
                res.send(null)
                return;
            }

            const schema = await schemaRepository.findOne({
                where: { documentURL: { $eq: msg.payload.url } }
            });
            res.send(schema);
        }
        catch (error) {
            res.send(null);
        }
    });

    /**
     * Get schema context
     * @param {string} [payload.url] Context URL
     * 
     * @returns Schema context
     */
    channel.response(MessageAPI.LOAD_SCHEMA_CONTEXT, async (msg, res) => {
        try {
            if (!msg.payload || !msg.payload.url) {
                res.send(null)
                return;
            }

            const schema = await schemaRepository.findOne({
                where: { contextURL: { $eq: msg.payload.url } }
            });
            res.send(schema);
        }
        catch (error) {
            res.send(null);
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
            res.send(schemes);
            return;
        }
        if (msg.payload && msg.payload.uuid) {
            const schemes = await schemaRepository.find({
                where: { uuid: { $eq: msg.payload.uuid } }
            });
            res.send(schemes);
            return;
        }
        const schemes = await schemaRepository.find({
            where: { status: { $eq: SchemaStatus.PUBLISHED } }
        });
        res.send(schemes);
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
                    console.error("not item");
                    res.send(null);
                    return;
                }

                if (item.creator != owner) {
                    console.error("not owner");
                    res.send(null);
                    return;
                }

                if (item.status == SchemaStatus.PUBLISHED) {
                    console.error("not status");
                    res.send(null);
                    return;
                }

                SchemaHelper.updateVersion(item, version);

                const itemDocument = JSON.parse(item.document);
                const defsArray = Object.values(itemDocument.$defs);
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
                    console.error("not root");
                    res.send(null);
                    return;
                }

                const messageId = await HederaHelper
                    .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
                    .submitMessage(process.env.SUBMIT_SCHEMA_TOPIC_ID, JSON.stringify(schemaPublishMessage));

                item.messageId = messageId;

                updateIRI(item);
                await schemaRepository.update(item.id, item);

                res.send(item);
                return;
            }
            console.error("not id");
            res.send(null);
        } catch (error) {
            console.error(error);
            res.send(null);
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
        res.send(schemes);
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
        res.send(schemes);
    });










    // /**
    //  * Import schemes
    //  * 
    //  * @param {ISchema[]} payload - schemes
    //  * 
    //  * @returns {ISchema[]} - all schemes
    //  */
    // channel.response(MessageAPI.IMPORT_SCHEMA, async (msg, res) => {
    //     try {
    //         let items: ISchema[] = msg.payload;
    //         if (!Array.isArray(items)) {
    //             items = [items];
    //         }

    //         let importSchemes = [];
    //         for (let i = 0; i < items.length; i++) {
    //             const { iri, version, uuid } = SchemaModel.parsRef(items[i]);
    //             items[i].uuid = uuid;
    //             items[i].version = version;
    //             items[i].iri = iri;
    //             items[i].status = SchemaStatus.PUBLISHED;
    //             if (uuid) {
    //                 importSchemes.push(items[i])
    //             }
    //         }
    //         const schemes = await schemaRepository.find();
    //         const mapName = {};
    //         for (let i = 0; i < schemes.length; i++) {
    //             mapName[schemes[i].iri] = true;
    //         }
    //         importSchemes = importSchemes.filter((s) => !mapName[s.iri]);

    //         const schemaObject = schemaRepository.create(importSchemes);
    //         await schemaRepository.save(schemaObject);

    //         const newSchemes = await schemaRepository.find();
    //         res.send(newSchemes);
    //     } catch (error) {
    //         console.error(error);
    //         res.send(null);
    //     }
    // });

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
            res.send({ body: schemasToExport });
        } catch (error) {
            res.send({ error: error.message });
        }
    });
}