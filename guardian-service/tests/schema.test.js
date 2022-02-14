require('module-alias/register');
const { expect, assert } = require('chai');
const { schemaAPI, schemaCache } = require('../dist/api/schema.service');
const {
    createChannel,
    createTable,
    checkMessage,
    checkError
} = require('./helper');

describe('Schema service', function () {
    let service, channel;

    const localSchema = 'undefined';

    const SET_SCHEMA = 'set-schema';
    const GET_SCHEMA = 'get-schema';
    const GET_SCHEMES = 'get-schemes';
    const IMPORT_SCHEMES_BY_MESSAGES = 'IMPORT_SCHEMES_BY_MESSAGES';
    const IMPORT_SCHEMES_BY_FILE = 'IMPORT_SCHEMES_BY_FILE';
    const PREVIEW_SCHEMA = 'preview-schema';
    const PUBLISH_SCHEMA = 'publish-schema';
    const DELETE_SCHEMA = 'delete-schema';
    const EXPORT_SCHEMES = 'export-schema';
    const INCREMENT_SCHEMA_VERSION = 'INCREMENT_SCHEMA_VERSION';

    const DRAFT = 'DRAFT';
    const PUBLISHED = 'PUBLISHED';
    const UNPUBLISHED = 'UNPUBLISHED';

    const s1 = {
        'uuid': '0fae2a20-0db2-4835-bab9-99b4effbe03e',
        'iri': '#0fae2a20-0db2-4835-bab9-99b4effbe03e',
        'document': JSON.stringify({
            '$id': '#0fae2a20-0db2-4835-bab9-99b4effbe03e',
            '$comment': '{"term": "0fae2a20-0db2-4835-bab9-99b4effbe03e", "@id": "#0fae2a20-0db2-4835-bab9-99b4effbe03e"}',
            'title': '',
            'description': '',
            'type': 'object',
            'properties': {
                '@context': {
                    'oneOf': [
                        {
                            'type': 'string'
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string'
                            }
                        }
                    ]
                },
                'type': {
                    'oneOf': [
                        {
                            'type': 'string'
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string'
                            }
                        }
                    ]
                },
                'id': {
                    'type': 'string'
                },
                'f1': {
                    'title': '',
                    'description': '',
                    '$comment': '{"term": "f1", "@id": "https://www.schema.org/text"}',
                    'type': 'string'
                },
                'f2': {
                    'title': '',
                    'description': '',
                    '$comment': '{"term": "f2", "@id": "https://www.schema.org/text"}',
                    'type': 'string'
                }
            },
            'required': [
                '@context',
                'type'
            ],
            'additionalProperties': false
        }),
        'entity': 'entity',
        'name': 'type'
    }

    const s2 = {
        'uuid': '59b934e2-9eb6-4395-9b85-ad3624f1f752',
        'document': JSON.stringify({
            '$id': '#59b934e2-9eb6-4395-9b85-ad3624f1f752',
            '$comment': '{"term": "59b934e2-9eb6-4395-9b85-ad3624f1f752", "@id": "#59b934e2-9eb6-4395-9b85-ad3624f1f752"}',
            'title': '',
            'description': '',
            'type': 'object',
            'properties': {
                '@context': {
                    'oneOf': [
                        {
                            'type': 'string'
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string'
                            }
                        }
                    ]
                },
                'type': {
                    'oneOf': [
                        {
                            'type': 'string'
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string'
                            }
                        }
                    ]
                },
                'id': {
                    'type': 'string'
                },
                'f3': {
                    'title': '',
                    'description': '',
                    'type': 'array',
                    'items': {
                        '$ref': '#ad2de08d-a43c-43c7-a458-3f0e8db65e8f'
                    },
                    '$comment': '{"term": "f3", "@id": "#ad2de08d-a43c-43c7-a458-3f0e8db65e8f"}'
                },
                'f4': {
                    'title': '',
                    'description': '',
                    '$comment': '{"term": "f4", "@id": "https://www.schema.org/text"}',
                    'type': 'string'
                }
            },
            'required': [
                '@context',
                'type',
                'f3'
            ],
            'additionalProperties': false
        }),
        'entity': 'entity2',
        'name': 'type2'
    }
    const s3 = {
        'uuid': 'ad2de08d-a43c-43c7-a458-3f0e8db65e8f',
        'document': JSON.stringify({
            '$id': '#ad2de08d-a43c-43c7-a458-3f0e8db65e8f',
            '$comment': '{"term": "ad2de08d-a43c-43c7-a458-3f0e8db65e8f", "@id": "#ad2de08d-a43c-43c7-a458-3f0e8db65e8f"}',
            'title': '',
            'description': '',
            'type': 'object',
            'properties': {
                '@context': {
                    'oneOf': [
                        {
                            'type': 'string'
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string'
                            }
                        }
                    ]
                },
                'type': {
                    'oneOf': [
                        {
                            'type': 'string'
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string'
                            }
                        }
                    ]
                },
                'id': {
                    'type': 'string'
                },
                'f5': {
                    'title': '',
                    'description': '',
                    '$comment': '{"term": "f5", "@id": "https://www.schema.org/text"}',
                    'type': 'integer'
                },
                'f6': {
                    'title': '',
                    'description': '',
                    '$comment': '{"term": "f6", "@id": "https://www.schema.org/text"}',
                    'type': 'string',
                    'format': 'date'
                }
            },
            'required': [
                '@context',
                'type'
            ],
            'additionalProperties': false
        }),
        'entity': 'entity3',
        'name': 'type3'
    }

    const s1db = {
        ...s1,
        '_id': '1',
        'id': '1',
        'readonly': false,
        'status': PUBLISHED,
    }

    let schemas = [];
    let index = 0;

    before(async function () {
        channel = createChannel();
        const schemaRepository = createTable();
        schemaRepository.create = function (items) {
            if (Array.isArray(items)) {
                for (let i = 0; i < items.length; i++) {
                    items[i] = Object.assign({ _id: String(++index) }, items[i], true);
                    items[i].id = items[i]._id
                }
                return items;
            } else {
                items = Object.assign({ _id: String(++index) }, items, true);
                items.id = items._id
                return items;
            }
        };
        schemaRepository.save = async function (items) {
            if (Array.isArray(items)) {
                for (let i = 0; i < items.length; i++) {
                    const element = items[i];
                    schemas.push(element);
                }
            } else {
                schemas.push(items);
            }
        }
        schemaRepository.find = async function (param) {
            if (!param) {
                return schemas;
            }
            return param;
        }

        schemaRepository.findOne = async function (param) {
            if (param === 0) {
                return schemas[0];
            }
            if (param === 1) {
                return null;
            }
            if (!param) {
                return schemas;
            }
            return param;
        }

        schemaRepository.update = async function (id, item) {
            const i = schemas.findIndex(e => e._id == id);
            if (i > -1) {
                schemas[i] = item
            }
        }

        schemaRepository.delete = async function (id) {
            schemas = schemas.filter(e => e._id != id);
        }

        service = schemaAPI(channel,
            schemaRepository
        );

        schemaCache['0fae2a20-0db2-4835-bab9-99b4effbe03e'] = s1;
    });

    it('Config service init', async function () {
        assert.exists(channel.map[SET_SCHEMA]);
        assert.exists(channel.map[GET_SCHEMA]);
        assert.exists(channel.map[GET_SCHEMES]);
        assert.exists(channel.map[IMPORT_SCHEMES_BY_MESSAGES]);
        assert.exists(channel.map[IMPORT_SCHEMES_BY_FILE]);
        assert.exists(channel.map[PREVIEW_SCHEMA]);
        assert.exists(channel.map[PUBLISH_SCHEMA]);
        assert.exists(channel.map[DELETE_SCHEMA]);
        assert.exists(channel.map[EXPORT_SCHEMES]);
        assert.exists(channel.map[INCREMENT_SCHEMA_VERSION]);
    });

    it('Test SET_SCHEMA', async function () {
        let value = await channel.run(SET_SCHEMA, {
            uuid: '0fae2a20-0db2-4835-bab9-99b4effbe03e',
            name: 'type',
            entity: 'entity',
            readonly: false,
            status: PUBLISHED,
            document: JSON.stringify({
                '$id': '#0fae2a20-0db2-4835-bab9-99b4effbe03e',
                '$comment': '{"term": "0fae2a20-0db2-4835-bab9-99b4effbe03e", "@id": "#0fae2a20-0db2-4835-bab9-99b4effbe03e"}',
                'title': '',
                'description': '',
                'type': 'object',
                'properties': {
                    '@context': {
                        'oneOf': [
                            {
                                'type': 'string'
                            },
                            {
                                'type': 'array',
                                'items': {
                                    'type': 'string'
                                }
                            }
                        ]
                    },
                    'type': {
                        'oneOf': [
                            {
                                'type': 'string'
                            },
                            {
                                'type': 'array',
                                'items': {
                                    'type': 'string'
                                }
                            }
                        ]
                    },
                    'id': {
                        'type': 'string'
                    },
                    'f1': {
                        'title': '',
                        'description': '',
                        '$comment': '{"term": "f1", "@id": "https://www.schema.org/text"}',
                        'type': 'string'
                    },
                    'f2': {
                        'title': '',
                        'description': '',
                        '$comment': '{"term": "f2", "@id": "https://www.schema.org/text"}',
                        'type': 'string'
                    }
                },
                'required': [
                    '@context',
                    'type'
                ],
                'additionalProperties': false
            })
        });
        checkMessage(value, [{ ...s1db, status: DRAFT, iri: '#0fae2a20-0db2-4835-bab9-99b4effbe03e', version: null }]);
    });

    it('Test GET_SCHEMA', async function () {
        let value = await channel.run(GET_SCHEMA, null);
        checkError(value, 'Schema not found');

        value = await channel.run(GET_SCHEMA, { id: "id" });
        checkMessage(value, "id");

        value = await channel.run(GET_SCHEMA, { messageId: "messageId" });
        checkMessage(value, {
            where: {
                messageId: { '$eq': 'messageId' },
            }
        });

        value = await channel.run(GET_SCHEMA, { entity: "entity" });
        checkMessage(value, {
            where: {
                entity: { '$eq': 'entity' }
            }
        });
    });

    it('Test GET_SCHEMES', async function () {
        let value = await channel.run(GET_SCHEMES, null);
        checkMessage(value, {
            where: {
                status: { "$eq": PUBLISHED }
            }
        });

        value = await channel.run(GET_SCHEMES, { uuid: 'uuid' });
        checkMessage(value, {
            where: {
                uuid: { '$eq': 'uuid' }
            }
        });

        value = await channel.run(GET_SCHEMES, { owner: 'owner1' });
        checkMessage(value, {
            where: {
                "$or": [
                    {
                        status: {
                            "$eq": "PUBLISHED"
                        }
                    }, {
                        owner: {
                            "$eq": "owner1"
                        }
                    }
                ]
            }
        });
    });

    it('Test IMPORT_SCHEMES_BY_MESSAGES', async function () {
        let value = await channel.run(IMPORT_SCHEMES_BY_MESSAGES, null);
        checkError(value, 'Schema not found');

        value = await channel.run(IMPORT_SCHEMES_BY_MESSAGES, { messageIds: "messageIds" });
        checkError(value, 'Schema not found');

        value = await channel.run(IMPORT_SCHEMES_BY_MESSAGES, { owner: "owner" });
        checkError(value, 'Schema not found');

        value = await channel.run(IMPORT_SCHEMES_BY_MESSAGES, { messageIds: ["0fae2a20-0db2-4835-bab9-99b4effbe03e"], owner: "owner" });
        checkMessage(value, [{
            "newIRI": value.body[0].newIRI,
            "newUUID": value.body[0].newUUID,
            "oldIRI": "#0fae2a20-0db2-4835-bab9-99b4effbe03e",
            "oldUUID": "0fae2a20-0db2-4835-bab9-99b4effbe03e"
        }]);
    });

    it('Test PREVIEW_SCHEMA', async function () {
        let value = await channel.run(PREVIEW_SCHEMA, null);
        checkError(value, 'Schema not found');

        value = await channel.run(PREVIEW_SCHEMA, { messageIds: ['0fae2a20-0db2-4835-bab9-99b4effbe03e'] });
        checkMessage(value, [s1]);
    });

    it('Test PUBLISH_SCHEMA', async function () {
        let value = await channel.run(PUBLISH_SCHEMA, null);
        checkError(value, 'Invalid id');

        value = await channel.run(PUBLISH_SCHEMA, { id: 1 });
        checkError(value, 'Schema not found');

        value = await channel.run(PUBLISH_SCHEMA, { id: 0, owner: "owner" });
        checkError(value, 'Invalid owner');
    });

    it('Test DELETE_SCHEMA', async function () {
        let value = await channel.run(DELETE_SCHEMA, '2');
        checkMessage(value, schemas);
    });
});