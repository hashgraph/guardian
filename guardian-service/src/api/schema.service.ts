import { Schema } from '@entity/schema';
import { ISchema, MessageAPI, SchemaEntity, SchemaStatus, Schema as SchemaModel } from 'interfaces';
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
        const _required = [];

        let item: any;
        
        item = schemaRepository.create({
            name: 'MintToken',
            uuid: "MintToken",
            entity: SchemaEntity.MINT_TOKEN,
            document: JSON.stringify({
                '$id': '#MintToken',
                '$comment': `{"term": "MintToken", "@id": "${localSchema}#MintToken"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'date': {
                        '$comment': `{"term": "date", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'amount': {
                        '$comment': `{"term": "amount", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'tokenId': {
                        '$comment': `{"term": "tokenId", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'WipeToken',
            uuid: "WipeToken",
            entity: SchemaEntity.WIPE_TOKEN,
            document: JSON.stringify({
                '$id': '#WipeToken',
                '$comment': `{"term": "WipeToken", "@id": "${localSchema}#WipeToken"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'date': {
                        '$comment': `{"term": "date", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'amount': {
                        '$comment': `{"term": "amount", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'tokenId': {
                        '$comment': `{"term": "tokenId", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'RootAuthority',
            uuid: "RootAuthority",
            entity: SchemaEntity.ROOT_AUTHORITY,
            document: JSON.stringify({
                '$id': '#RootAuthority',
                '$comment': `{"term": "RootAuthority", "@id": "${localSchema}#RootAuthority"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'name': {
                        '$comment': `{"term": "date", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'MintNFToken',
            uuid: "MintNFToken",
            entity: SchemaEntity.MINT_NFTOKEN,
            document: JSON.stringify({
                '$id': '#MintNFToken',
                '$comment': `{"term": "MintNFToken", "@id": "${localSchema}#MintNFToken"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'date': {
                        '$comment': `{"term": "date", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'serials':
                    {
                        '$comment': `{"term": "serials", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'array',
                        'items': {
                            'type': 'string',
                        }
                    },
                    'tokenId': {
                        '$comment': `{"term": "tokenId", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'Policy',
            uuid: "Policy",
            entity: SchemaEntity.POLICY,
            document: JSON.stringify({
                '$id': '#Policy',
                '$comment': `{"term": "Policy", "@id": "${localSchema}#Policy"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'name': {
                        '$comment': `{"term": "name", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'description': {
                        '$comment': `{"term": "description", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'topicDescription': {
                        '$comment': `{"term": "topicDescription", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'version': {
                        '$comment': `{"term": "version", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'policyTag': {
                        '$comment': `{"term": "policyTag", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        
        item = schemaRepository.create({
            name: 'Inverter',
            uuid: "9d31b4ee-2280-43ee-81e7-b225ee208802",
            entity: SchemaEntity.INVERTER,
            document: JSON.stringify({
                '$id': '#9d31b4ee-2280-43ee-81e7-b225ee208802',
                '$comment': `{"term": "9d31b4ee-2280-43ee-81e7-b225ee208802", "@id": "${localSchema}#9d31b4ee-2280-43ee-81e7-b225ee208802"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'policyId': {
                        '$comment': `{"term": "policyId", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'projectId': {
                        '$comment': `{"term": "projectId", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'projectName': {
                        '$comment': `{"term": "projectName", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'sensorType': {
                        '$comment': `{"term": "sensorType", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'capacity': {
                        '$comment': `{"term": "capacity", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'Installer',
            uuid: "b613e284-5af3-465e-a9a9-329a706180fc",
            entity: SchemaEntity.INSTALLER,
            document: JSON.stringify({
                '$id': '#b613e284-5af3-465e-a9a9-329a706180fc',
                '$comment': `{"term": "b613e284-5af3-465e-a9a9-329a706180fc", "@id": "${localSchema}#b613e284-5af3-465e-a9a9-329a706180fc"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'policyId': {
                        '$comment': `{"term": "policyId", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'name': {
                        '$comment': `{"term": "name", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);

        item = schemaRepository.create({
            name: 'MRV',
            uuid: "c4623dbd-2453-4c12-941f-032792a00727",
            entity: SchemaEntity.MRV,
            document: JSON.stringify({
                '$id': '#c4623dbd-2453-4c12-941f-032792a00727',
                '$comment': `{"term": "c4623dbd-2453-4c12-941f-032792a00727", "@id": "${localSchema}#c4623dbd-2453-4c12-941f-032792a00727"}`,
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    ..._properties,
                    'policyId': {
                        '$comment': `{"term": "policyId", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'accountId': {
                        '$comment': `{"term": "accountId", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'date': {
                        '$comment': `{"term": "date", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'amount': {
                        '$comment': `{"term": "amount", "@id": "https://www.schema.org/text"}`,
                        'title': '',
                        'description': '',
                        'type': 'string'
                    },
                    'period': {
                        '$comment': `{"term": "period", "@id": "https://www.schema.org/text"}`,
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
            status: SchemaStatus.PUBLISHED,
            readonly: true
        });
        await schemaRepository.save(item);
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
        try {
            let items: ISchema[] = msg.payload;
            if (!Array.isArray(items)) {
                items = [items];
            }

            items = items.filter((e) => e.uuid && e.document);
            const schemes = await schemaRepository.find();
            const mapName = {};
            for (let i = 0; i < schemes.length; i++) {
                mapName[schemes[i].uuid] = true;
            }
            items = items.filter((e) => !mapName[e.uuid]);

            const schemaObject = schemaRepository.create(items);
            await schemaRepository.save(schemaObject);

            const newSchemes = await schemaRepository.find();
            res.send(newSchemes);
        } catch (error) {
            console.error(error)
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
            const ids = msg.payload as string[];
            const data = await schemaRepository.find();
            const schemes = data.map(s => new SchemaModel(s));
            const mapType: any = {};
            const mapSchemes: any = {};
            const result = [];
            for (let i = 0; i < schemes.length; i++) {
                const schema = schemes[i];
                mapType[schema.ref] = false;
                mapSchemes[schema.ref] = schema;
                if (ids.indexOf(schema.uuid) != -1) {
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
                })
            }
            res.send(documents);
        } catch (error) {
            console.error(error);
            res.send(null);
        }
    });
}