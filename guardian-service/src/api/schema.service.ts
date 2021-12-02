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
    if (await schemaRepository.count() === 0) {
        const _properties = {
            '@context': {
                oneOf: [
                    {
                        type: 'string',
                    },
                    {
                        type: 'array',
                        items: {
                            type: 'string',
                        }
                    },
                ],
            },
            type: {
                oneOf: [
                    {
                        type: 'string',
                    },
                    {
                        type: 'array',
                        items: {
                            type: 'string',
                        }
                    },
                ],
            },
            id: {
                type: 'string',
            }
        };
        const _required = ['@context', 'type'];
        
        let item: any;
        item = schemaRepository.create({
            name: 'Inverter',
            document: JSON.stringify({
                '$id': '#Inverter',
                '$comment': `{'term': 'Inverter', '@id': '${localSchema}#Inverter'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'policyId': {
                        '$comment': `{'term': 'policyId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'projectId': {
                        '$comment': `{'term': 'projectId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'projectName': {
                        '$comment': `{'term': 'projectName', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'sensorType': {
                        '$comment': `{'term': 'sensorType', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'capacity': {
                        '$comment': `{'term': 'capacity', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                },
                'required': [
                    ..._required,
                    'policyId',
                    'projectId',
                    'projectName',
                    'sensorType',
                    'capacity'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.INVERTER,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'Installer',
            document: JSON.stringify({
                '$id': '#Installer',
                '$comment': `{'term': 'Installer', '@id': '${localSchema}#Installer'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'policyId': {
                        '$comment': `{'term': 'policyId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'name': {
                        '$comment': `{'term': 'name', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    }
                },
                'required': [
                    ..._required,
                    'policyId',
                    'name'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.INSTALLER,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'MRV',
            document: JSON.stringify({
                '$id': '#MRV',
                '$comment': `{'term': 'MRV', '@id': '${localSchema}#MRV'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'policyId': {
                        '$comment': `{'term': 'policyId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'accountId': {
                        '$comment': `{'term': 'accountId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'date': {
                        '$comment': `{'term': 'date', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'amount': {
                        '$comment': `{'term': 'amount', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'period': {
                        '$comment': `{'term': 'period', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                },
                'required': [
                    ..._required,
                    'policyId',
                    'accountId',
                    'date',
                    'amount',
                    'period'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.MRV,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'MintToken',
            document: JSON.stringify({
                '$id': '#MintToken',
                '$comment': `{'term': 'MintToken', '@id': '${localSchema}#MintToken'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'date': {
                        '$comment': `{'term': 'date', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'amount': {
                        '$comment': `{'term': 'amount', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'tokenId': {
                        '$comment': `{'term': 'tokenId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    }
                },
                'required': [
                    ..._required,
                    'date',
                    'amount',
                    'tokenId'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.TOKEN,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'WipeToken',
            document: JSON.stringify({
                '$id': '#WipeToken',
                '$comment': `{'term': 'WipeToken', '@id': '${localSchema}#WipeToken'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'date': {
                        '$comment': `{'term': 'date', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'amount': {
                        '$comment': `{'term': 'amount', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'tokenId': {
                        '$comment': `{'term': 'tokenId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    }
                },
                'required': [
                    ..._required,
                    'date',
                    'amount',
                    'tokenId'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.TOKEN,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'RootAuthority',
            document: JSON.stringify({
                '$id': '#RootAuthority',
                '$comment': `{'term': 'RootAuthority', '@id': '${localSchema}#RootAuthority'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'name': {
                        '$comment': `{'term': 'date', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    }
                },
                'required': [
                    ..._required,
                    'name'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.ROOT_AUTHORITY,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'MintNFToken',
            document: JSON.stringify({
                '$id': '#MintNFToken',
                '$comment': `{'term': 'MintNFToken', '@id': '${localSchema}#MintNFToken'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'date': {
                        '$comment': `{'term': 'date', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'serials':
                    {
                        '$comment': `{'term': 'serials', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'array',
                        'items': {
                            'type': 'string',
                        }
                    },
                    'tokenId': {
                        '$comment': `{'term': 'tokenId', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    }
                },
                'required': [
                    ..._required,
                    'date',
                    'serials',
                    'tokenId'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.TOKEN,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'Policy',
            document: JSON.stringify({
                '$id': '#Policy',
                '$comment': `{'term': 'Policy', '@id': '${localSchema}#Policy'}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'name': {
                        '$comment': `{'term': 'name', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'description': {
                        '$comment': `{'term': 'description', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'topicDescription': {
                        '$comment': `{'term': 'topicDescription', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'version': {
                        '$comment': `{'term': 'version', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'policyTag': {
                        '$comment': `{'term': 'policyTag', '@id': 'https://www.schema.org/text'}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    }
                },
                'required': [
                    ..._required,
                    'name',
                    'description',
                    'topicDescription',
                    'version',
                    'policyTag'
                ],
                'additionalProperties': false,
            }),
            entity: SchemaEntity.ROOT_AUTHORITY,
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);
    }
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