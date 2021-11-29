import { Schema } from '@entity/schema';
import { ISchema, MessageAPI, SchemaEntity, SchemaStatus } from 'interfaces';
import { MongoRepository } from 'typeorm';

const localSchema = 'https://localhost/schema';

/**
 * Creation of default schemes.
 * 
 * @param schemaRepository - table with schemes
 */
export const setDefaultSchema = async function (schemaRepository: MongoRepository<Schema>) {
    /*
    if (await schemaRepository.count() === 0) {
        let item = schemaRepository.create({
            type: 'Inverter',
            document: {
                '@id': localSchema + '#Inverter',
                '@context': {
                    'policyId': { '@id': 'https://www.schema.org/identifier' },
                    'projectId': { '@id': 'https://www.schema.org/identifier' },
                    'projectName': { '@id': 'https://www.schema.org/name' },
                    'sensorType': { '@id': 'https://www.schema.org/text' },
                    'capacity': { '@id': 'https://www.schema.org/value' }
                }
            },
            entity: SchemaEntity.INVERTER,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            type: 'Installer',
            document: {
                '@id': localSchema + '#Installer',
                '@context': {
                    'policyId': { '@id': 'https://www.schema.org/identifier' },
                    'name': { '@id': 'https://www.schema.org/text' }
                }
            },
            entity: SchemaEntity.INSTALLER,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            type: 'MRV',
            document: {
                '@id': localSchema + '#MRV',
                '@context': {
                    'policyId': { '@id': 'https://www.schema.org/identifier' },
                    'accountId': { '@id': 'https://www.schema.org/text' },
                    'date': { '@id': 'https://www.schema.org/text' },
                    'amount': { '@id': 'https://www.schema.org/amount' },
                    'period': { '@id': 'https://www.schema.org/text' }
                }
            },
            entity: SchemaEntity.MRV,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            type: 'MintToken',
            document: {
                '@id': localSchema + '#MintToken',
                '@context': {
                    'date': { '@id': 'https://www.schema.org/text' },
                    'amount': { '@id': 'https://www.schema.org/amount' },
                    'tokenId': { '@id': 'https://www.schema.org/identifier' }
                }
            },
            entity: SchemaEntity.TOKEN,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            type: 'WipeToken',
            document: {
                '@id': localSchema + '#WipeToken',
                '@context': {
                    'date': { '@id': 'https://www.schema.org/text' },
                    'amount': { '@id': 'https://www.schema.org/amount' },
                    'tokenId': { '@id': 'https://www.schema.org/identifier' }
                }
            },
            entity: SchemaEntity.TOKEN,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            type: 'RootAuthority',
            document: {
                '@id': localSchema + '#RootAuthority',
                '@context': {
                    'name': { '@id': 'https://www.schema.org/text' }
                }
            },
            entity: SchemaEntity.ROOT_AUTHORITY,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            type: 'MintNFToken',
            document: {
                '@id': localSchema + '#MintNFToken',
                '@context': {
                    'date': { '@id': 'https://www.schema.org/text' },
                    'serials': { '@id': 'https://www.schema.org/ItemList' },
                    'tokenId': { '@id': 'https://www.schema.org/identifier' }
                }
            },
            entity: SchemaEntity.TOKEN,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            type: 'Policy',
            document: {
                '@id': localSchema + '#Policy',
                '@context': {
                    'name': { '@id': 'https://www.schema.org/text' },
                    'description': { '@id': 'https://www.schema.org/text' },
                    'topicDescription': { '@id': 'https://www.schema.org/text' },
                    'version': { '@id': 'https://www.schema.org/text' },
                    'policyTag': { '@id': 'https://www.schema.org/text' }
                }
            },
            entity: SchemaEntity.ROOT_AUTHORITY,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);
    }
    */
}

const getRelationships = function (schema: Schema) {
    const document = schema.document;
    const id = document['@id'] as string;
    const context = document['@context'];
    const result = [];
    if (id.startsWith(`${localSchema}#`)) {
        const keys = Object.keys(context);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            const field = context[key];
            const fieldId = field['@id'] as string;
            const fieldIds = fieldId.split('#');
            if (fieldIds[0] == localSchema && fieldIds[1]) {
                result.push(fieldIds[1]);
            }
        }
    }
    return result;
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
            await schemaRepository.delete(id);
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
                item.entity = msg.payload.entity;
                item.document = msg.payload.document;
                await schemaRepository.update(item.id, item);
            }
        } else {
            const schemaObject = schemaRepository.create(msg.payload);
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
        let schemes: ISchema[] = null;
        if (msg.payload) {
            const { type, entity } = msg.payload;
            const reqObj: any = { where: {} };
            if (type !== undefined) {
                reqObj.where['type'] = { $eq: type }
            } else if (entity !== undefined) {
                reqObj.where['entity'] = { $eq: entity }
            }
            schemes = await schemaRepository.find(reqObj);
        } else {
            schemes = await schemaRepository.find();
        }
        schemes = schemes || [];
        res.send(schemes);
    });

    /**
     * Import schemes
     * 
     * @param {ISchema[]} payload - schemes
     * 
     * @returns {ISchema[]} - all schemes
     */
    channel.response(MessageAPI.IMPORT_SCHEMA, async (msg, res) => {
        // try {
        //     let items = msg.payload;
        //     if (!Array.isArray(items)) {
        //         items = [items];
        //     }
        //     items = items.filter((e) => e.type && e.document);
        //     const schemes = await schemaRepository.find();
        //     const mapName = {};
        //     for (let i = 0; i < schemes.length; i++) {
        //         mapName[schemes[i].type] = true;
        //     }
        //     const mapId = {};
        //     for (let i = 0; i < items.length; i++) {
        //         const element = items[i];
        //         const type = element.type;
        //         const id = localSchema + '#' + type;
        //         if (mapName[type]) {
        //             const newType = type + `(${(new Date()).getTime()})`;
        //             const newId = localSchema + '#' + newType;
        //             element.type = newType;
        //             mapId[id] = newId;
        //             mapName[newType] = true;
        //         } else {
        //             mapId[id] = id;
        //             mapName[type] = true;
        //         }
        //     }
        //     for (let i = 0; i < items.length; i++) {
        //         const element = items[i].document;
        //         if (mapId[element['@id']]) {
        //             element['@id'] = mapId[element['@id']];
        //         }
        //         const context = element['@context'];
        //         const keys = Object.keys(context);
        //         for (let j = 0; j < keys.length; j++) {
        //             const key = keys[j];
        //             if (mapId[context[key]['@id']]) {
        //                 context[key]['@id'] = mapId[context[key]['@id']];
        //             }
        //         }
        //     }
        //     const schemaObject = schemaRepository.create(items);
        //     const result = await schemaRepository.save(schemaObject);
        //     const newSchemes = await schemaRepository.find();
        //     res.send(newSchemes);
        // } catch (error) {
        //     console.error(error)
        // }
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
        // try {
        //     let ids = msg.payload as string[];
        //     let schemes = await schemaRepository.find();
        //     const mapType: any = {};
        //     const mapSchemes: any = {};
        //     const result = [];
        //     for (let i = 0; i < schemes.length; i++) {
        //         const schema = schemes[i];
        //         mapType[schema.type] = false;
        //         mapSchemes[schema.type] = schema;
        //         if (ids.indexOf(schema.type) != -1) {
        //             mapType[schema.type] = true;
        //             result.push(schema);
        //         }
        //     }
        //     let index = 0;
        //     while (index < result.length) {
        //         const relationships = getRelationships(result[index]);
        //         for (let i = 0; i < relationships.length; i++) {
        //             const type = relationships[i];
        //             if (!mapType[type]) {
        //                 mapType[type] = true;
        //                 result.push(mapSchemes[type]);
        //             }
        //         }
        //         index++;
        //     }
        //     res.send(result);
        // } catch (error) {
        //     console.error(error);
        //     res.send(null);
        // }
    });
}