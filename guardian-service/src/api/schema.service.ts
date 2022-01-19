import { Schema } from '@entity/schema';
import { ISchema, MessageAPI, SchemaEntity, SchemaStatus, Schema as SchemaModel } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { readJSON, writeJSON, readdirSync } from 'fs-extra';
import path from 'path';

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
 * Connect to the message broker methods of working with schemes.
 * 
 * @param channel - channel
 * @param schemaRepository - table with schemes
 */
export const schemaAPI = async function (
    channel: any,
    schemaRepository: MongoRepository<Schema>
): Promise<void> {
    /**
     * Change the status of a schema on PUBLISHED.
     * 
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id 
     * 
     * @returns {ISchema[]} - all schemes
     */
    channel.response(MessageAPI.PUBLISH_SCHEMA, async (msg, res) => {
        if (msg.payload) {
            const id = msg.payload as string;
            const item = await schemaRepository.findOne(id);
            if (item) {
                item.status = SchemaStatus.PUBLISHED;
                updateIRI(item);
                await schemaRepository.update(item.id, item);
            }
        }
        const schemes = await schemaRepository.find();
        res.send(schemes);
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
    channel.response(MessageAPI.GET_SCHEMES, async (msg, res) => {
        if (msg.payload) {
            if (msg.payload.id) {
                const schema = await schemaRepository.findOne(msg.payload.id);
                res.send(schema);
                return;
            }
            if (msg.payload.uuid) {
                const schemes = await schemaRepository.find({
                    where: { uuid: { $eq: msg.payload.uuid } }
                });
                res.send(schemes);
                return;
            }
            const { type, entity, owner } = msg.payload;
            const filter: any = {};
            if (type !== undefined) {
                filter.type = { $eq: type };
            }
            if (entity !== undefined) {
                filter.entity = { $eq: entity };
            }
            const reqObj: any = {};
            if (owner) {
                reqObj.where = {
                    $or: [
                        {
                            ...filter,
                            status: { $eq: SchemaStatus.PUBLISHED },
                        },
                        {
                            ...filter,
                            owner: { $eq: owner }
                        },
                    ]
                }
            } else {
                filter.status = { $eq: SchemaStatus.PUBLISHED };
                reqObj.where = filter;
            }
            // reqObj.order = {
            //     name: "uuid",
            //     id: "DESC",
            // }
            const schemes = await schemaRepository.find(reqObj);
            res.send(schemes);
        } else {
            const schemes = await schemaRepository.find();
            res.send(schemes);
        }
    });

    /**
     * Import schemes
     * 
     * @param {ISchema[]} payload - schemes
     * 
     * @returns {ISchema[]} - all schemes
     */
    channel.response(MessageAPI.IMPORT_SCHEMA, async (msg, res) => {
        try {
            let items: ISchema[] = msg.payload;
            if (!Array.isArray(items)) {
                items = [items];
            }

            let importSchemes = [];
            for (let i = 0; i < items.length; i++) {
                const { iri, version, uuid, owner } = SchemaModel.parsRef(items[i]);
                items[i].uuid = uuid;
                items[i].version = version;
                items[i].owner = owner;
                items[i].iri = iri;
                items[i].status = SchemaStatus.PUBLISHED;
                if (uuid) {
                    importSchemes.push(items[i])
                }
            }
            const schemes = await schemaRepository.find();
            const mapName = {};
            for (let i = 0; i < schemes.length; i++) {
                mapName[schemes[i].iri] = true;
            }
            importSchemes = importSchemes.filter((s) => !mapName[s.iri]);

            const schemaObject = schemaRepository.create(importSchemes);
            await schemaRepository.save(schemaObject);

            const newSchemes = await schemaRepository.find();
            res.send(newSchemes);
        } catch (error) {
            console.error(error);
            res.send(null);
        }
    });

    /**
     * Export schemes
     * 
     * @param {Object} payload - filters
     * @param {string[]} payload.ids - schema ids
     * 
     * @returns {ISchema[]} - array of selected and nested schemas
     */
    channel.response(MessageAPI.EXPORT_SCHEMES, async (msg, res) => {
        try {
            const refs = msg.payload as string[];
            const allSchemes = await schemaRepository.find();
            const schemes = allSchemes.map(s => new SchemaModel(s));
            const mapType: any = {};
            const mapSchemes: any = {};
            const result = [];
            for (let i = 0; i < schemes.length; i++) {
                const schema = schemes[i];
                mapType[schema.ref] = false;
                mapSchemes[schema.ref] = schema;
                if (refs.indexOf(schema.ref) != -1) {
                    mapType[schema.ref] = true;
                    result.push(schema);
                }
            }
            let index = 0;
            while (index < result.length) {
                const relationships = getRelationships(result[index]);
                for (let i = 0; i < relationships.length; i++) {
                    const id = relationships[i];
                    if (mapType[id] === false) {
                        mapType[id] = true;
                        result.push(mapSchemes[id]);
                    }
                }
                result[index].relationships = relationships;
                index++;
            }
            const documents = [];
            for (let i = 0; i < result.length; i++) {
                const element = result[i];
                documents.push({
                    name: element.name,
                    uuid: element.uuid,
                    entity: element.entity,
                    document: element.document,
                    relationships: element.relationships,
                })
            }
            res.send(documents);
        } catch (error) {
            console.error(error);
            res.send(null);
        }
    });
}
