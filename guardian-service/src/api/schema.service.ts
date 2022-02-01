import { Schema } from '@entity/schema';
import { ISchema, MessageAPI, SchemaEntity, SchemaStatus, Schema as SchemaModel, ISchemaSubmitMessage, ModelActionType, SchemaHelper } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { readJSON, writeJSON, readdirSync } from 'fs-extra';
import path from 'path';
import { Blob } from 'buffer';
import { HederaHelper } from 'vc-modules';
import { RootConfig } from '@entity/root-config';
import { schemasToContext } from '@transmute/jsonld-schema';
import { IPFS } from '@helpers/ipfs';
import { Import } from '@helpers/import';

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

/**
 * Load schema by message identifier
 * @param messageId Message identifier
 * @param schemaRepository Schema repository
 * @returns Found or uploaded schema
 */
const loadSchema = async function (messageId: string, schemaRepository: MongoRepository<Schema>): Promise<Schema> {
    const schema = await schemaRepository.findOne({
        where: { messageId: { $eq: messageId } }
    });

    if (schema) {
        return schema;
    }

    const topicMessage = await Import.getTopicMessage(messageId) as ISchemaSubmitMessage;
    const context = await Import.getSchemaContext(topicMessage.context_cid);
    const schemaToImport = await Import.getSchema(topicMessage.cid) as Schema;

    schemaToImport.context = context;
    schemaToImport.documentURL = topicMessage.cid;
    schemaToImport.contextURL = topicMessage.context_cid;
    schemaToImport.messageId = messageId;

    updateIRI(schemaToImport);
    await schemaRepository.create(schemaToImport);

    return await schemaRepository.findOne({
        where: { messageId: { $eq: messageId } }
    });
}

/**
 * Get schema document
 * @param documentUrl Document URL
 * @param schemaRepository Schema repository
 * @returns Schema document
 */
const getSchemaDocument = async function (documentUrl: string, schemaRepository: MongoRepository<Schema>) {
    return await schemaRepository.findOne({
        where: { documentURL: { $eq: documentUrl } }
    });
}

/**
 * Get schema context
 * @param contextUrl Context URL
 * @param schemaRepository Schema repository
 * @returns Schema context
 */
const getSchemaContext = async function (contextUrl: string, schemaRepository: MongoRepository<Schema>) {
    return await schemaRepository.findOne({
        where: { contextURL: { $eq: contextUrl } }
    });
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
        if (msg.payload && msg.payload.id) {
            const schema = await schemaRepository.findOne(msg.payload.id);
            res.send(schema);
            return;
        }
        if (msg.payload && msg.payload.messageId) {
            const schema = await loadSchema(msg.payload.messageId, schemaRepository);
            res.send(schema);
            return;
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
                    res.send(null);
                }
    
                if (item.creator != owner) {
                    res.send(null);
                }
    
                if (item.status == SchemaStatus.PUBLISHED) {
                    res.send(null);
                }
                
                SchemaHelper.updateVersion(item, version);

                const itemDocument = JSON.parse(item.document);
                const defsArray = Object.values(itemDocument.$defs);
                item.context = JSON.stringify(schemasToContext([...defsArray, itemDocument]));

                const document = item.document;
                const context = item.context;
    
                const documentFile = new Blob([document], { type: "application/json" });
                const contextFile = new Blob([context], { type: "application/json" });
                const cid = await IPFS.addFile(await documentFile.arrayBuffer());
                const contextCid = await IPFS.addFile(await contextFile.arrayBuffer());
    
                item.status = SchemaStatus.PUBLISHED;
                item.documentURL = cid;
                item.contextURL = contextCid;
    
                const schemaPublishMessage: ISchemaSubmitMessage = {
                    name: item.name,
                    owner: item.creator,
                    cid: cid,
                    uuid: item.uuid,
                    version: item.version,
                    operation: ModelActionType.PUBLISH,
                    context_cid: contextCid
                }
    
                const root = await configRepository.findOne({ where: { did: { $eq: owner } } });
                if (!root) {
                    res.send(null);
                    return;
                }
    
                const messageId = await HederaHelper
                    .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
                    .submitMessage(process.env.SUBMIT_SCHEMA_TOPIC_ID, JSON.stringify(schemaPublishMessage));
    
                item.messageId = messageId.toString();
    
                updateIRI(item);
                await schemaRepository.update(item.id, item);
    
                res.send(item);
                return;
            }
            res.send(null);
        } catch (error) {
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

    // /**
    //  * Export schemes
    //  * 
    //  * @param {Object} payload - filters
    //  * @param {string[]} payload.ids - schema ids
    //  * 
    //  * @returns {ISchema[]} - array of selected and nested schemas
    //  */
    // channel.response(MessageAPI.EXPORT_SCHEMES, async (msg, res) => {
    //     try {
    //         const refs = msg.payload as string[];
    //         const allSchemes = await schemaRepository.find();
    //         const schemes = allSchemes.map(s => new SchemaModel(s));
    //         const mapType: any = {};
    //         const mapSchemes: any = {};
    //         const result = [];
    //         for (let i = 0; i < schemes.length; i++) {
    //             const schema = schemes[i];
    //             mapType[schema.ref] = false;
    //             mapSchemes[schema.ref] = schema;
    //             if (refs.indexOf(schema.ref) != -1) {
    //                 mapType[schema.ref] = true;
    //                 result.push(schema);
    //             }
    //         }
    //         let index = 0;
    //         while (index < result.length) {
    //             const relationships = getRelationships(result[index]);
    //             for (let i = 0; i < relationships.length; i++) {
    //                 const id = relationships[i];
    //                 if (mapType[id] === false) {
    //                     mapType[id] = true;
    //                     result.push(mapSchemes[id]);
    //                 }
    //             }
    //             result[index].relationships = relationships;
    //             index++;
    //         }
    //         const documents = [];
    //         for (let i = 0; i < result.length; i++) {
    //             const element = result[i];
    //             documents.push({
    //                 name: element.name,
    //                 uuid: element.uuid,
    //                 entity: element.entity,
    //                 document: element.document,
    //                 relationships: element.relationships,
    //             })
    //         }
    //         res.send(documents);
    //     } catch (error) {
    //         console.error(error);
    //         res.send(null);
    //     }
    // });
}