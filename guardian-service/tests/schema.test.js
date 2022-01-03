const { expect, assert } = require('chai');
const { schemaAPI } = require('../dist/api/schema.service');
const { createChannel, createTable } = require('./helper');

describe('Schema service', function () {
    let service, channel;

    const localSchema = 'https://localhost/schema';

    const PUBLISH_SCHEMA = 'publish-schema';
    const UNPUBLISHED_SCHEMA = 'unpublished-schema';
    const DELETE_SCHEMA = 'delete-schema';
    const SET_SCHEMA = 'set-schema';
    const GET_SCHEMES = 'get-schemes';
    const IMPORT_SCHEMA = 'import-schema';
    const EXPORT_SCHEMES = 'export-schema';

    const DRAFT = 'DRAFT';
    const PUBLISHED = 'PUBLISHED';
    const UNPUBLISHED = 'UNPUBLISHED';

    const s1 = {
        'uuid': '0fae2a20-0db2-4835-bab9-99b4effbe03e',
        'document': JSON.stringify({
            '$id': '#0fae2a20-0db2-4835-bab9-99b4effbe03e',
            '$comment': '{"term": "0fae2a20-0db2-4835-bab9-99b4effbe03e", "@id": "https://localhost/schema#0fae2a20-0db2-4835-bab9-99b4effbe03e"}',
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
            '$comment': '{"term": "59b934e2-9eb6-4395-9b85-ad3624f1f752", "@id": "https://localhost/schema#59b934e2-9eb6-4395-9b85-ad3624f1f752"}',
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
                    '$comment': '{"term": "f3", "@id": "https://localhost/schema#ad2de08d-a43c-43c7-a458-3f0e8db65e8f"}'
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
            '$comment': '{"term": "ad2de08d-a43c-43c7-a458-3f0e8db65e8f", "@id": "https://localhost/schema#ad2de08d-a43c-43c7-a458-3f0e8db65e8f"}',
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

        schemaRepository.findOne = async function (id) {
            const item = schemas.find(e => e._id == id);
            if (item) {
                return Object.assign({}, item);
            }
            return item;
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
    });

    it('Config service init', async function () {
        assert.exists(channel.map[SET_SCHEMA]);
        assert.exists(channel.map[GET_SCHEMES]);
        assert.exists(channel.map[IMPORT_SCHEMA]);
        assert.exists(channel.map[EXPORT_SCHEMES]);
        assert.exists(channel.map[PUBLISH_SCHEMA]);
        assert.exists(channel.map[UNPUBLISHED_SCHEMA]);
        assert.exists(channel.map[DELETE_SCHEMA]);
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
                '$comment': '{"term": "0fae2a20-0db2-4835-bab9-99b4effbe03e", "@id": "https://localhost/schema#0fae2a20-0db2-4835-bab9-99b4effbe03e"}',
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
        assert.deepEqual(value, [s1db]);
    });



    it('Test GET_SCHEMES', async function () {
        let value = await channel.run(GET_SCHEMES, null);
        assert.deepEqual(value, [s1db]);

        value = await channel.run(GET_SCHEMES, { type: 'type', entity: 'entity' });
        assert.deepEqual(value, { where: { type: { '$eq': 'type' } } });

        value = await channel.run(GET_SCHEMES, { entity: 'entity' });
        assert.deepEqual(value, { where: { entity: { '$eq': 'entity' } } });
    });


    it('Test IMPORT_SCHEMA|EXPORT_SCHEMES', async function () {
        await channel.run(SET_SCHEMA, {
            uuid: '59b934e2-9eb6-4395-9b85-ad3624f1f752',
            name: 'type2',
            entity: 'entity2',
            readonly: false,
            status: PUBLISHED,
            document: JSON.stringify({
                '$id': '#59b934e2-9eb6-4395-9b85-ad3624f1f752',
                '$comment': '{"term": "59b934e2-9eb6-4395-9b85-ad3624f1f752", "@id": "https://localhost/schema#59b934e2-9eb6-4395-9b85-ad3624f1f752"}',
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
                        '$comment': '{"term": "f3", "@id": "https://localhost/schema#ad2de08d-a43c-43c7-a458-3f0e8db65e8f"}'
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
            })
        });
        await channel.run(SET_SCHEMA, {
            uuid: 'ad2de08d-a43c-43c7-a458-3f0e8db65e8f',
            name: 'type3',
            entity: 'entity3',
            readonly: false,
            status: PUBLISHED,
            document: JSON.stringify({
                '$id': '#ad2de08d-a43c-43c7-a458-3f0e8db65e8f',
                '$comment': '{"term": "ad2de08d-a43c-43c7-a458-3f0e8db65e8f", "@id": "https://localhost/schema#ad2de08d-a43c-43c7-a458-3f0e8db65e8f"}',
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
            })
        });

        const s1e = {
            ...s1,
            'relationships': []
        }

        const export1 = await channel.run(EXPORT_SCHEMES, ['0fae2a20-0db2-4835-bab9-99b4effbe03e']);
        assert.deepEqual(export1, [s1e], 'Export 1');

        const s2e = {
            ...s2,
            'relationships': ['#ad2de08d-a43c-43c7-a458-3f0e8db65e8f']
        }

        const s3e = {
            ...s3,
            'relationships': []
        }

        const export2 = await channel.run(EXPORT_SCHEMES, ['0fae2a20-0db2-4835-bab9-99b4effbe03e', '59b934e2-9eb6-4395-9b85-ad3624f1f752']);
        assert.deepEqual(export2, [s1e, s2e, s3e], 'Export 2');

        schemas.length = 0;

        const s1i = {
            ...s1,
            '_id': '4',
            'id': '4',
            'relationships': []
        }
        const s2i = {
            ...s2,
            '_id': '5',
            'id': '5',
            'relationships': ['#ad2de08d-a43c-43c7-a458-3f0e8db65e8f']
        }
        const s3i = {
            ...s3,
            '_id': '6',
            'id': '6',
            'relationships': []
        }
        const import1 = await channel.run(IMPORT_SCHEMA, export1);
        assert.deepEqual(import1, [s1i], 'Import 1');

        const import2 = await channel.run(IMPORT_SCHEMA, export2);
        assert.deepEqual(import2, [s1i, s2i, s3i], 'Import 2');
    });


    it('Test PUBLISH_SCHEMA', async function () {
        index = 0;
        schemas.length = 0;
        await channel.run(SET_SCHEMA, {
            ...s1,
            'readonly': false,
            'status': DRAFT,
        });
        await channel.run(SET_SCHEMA, {
            ...s2,
            'readonly': false,
            'status': DRAFT,
        });
        let value = await channel.run(PUBLISH_SCHEMA, '2');

        const s1i = {
            ...s1,
            '_id': '1',
            'id': '1',
            'readonly': false,
            'status': DRAFT,
        }
        const s2i = {
            ...s2,
            '_id': '2',
            'id': '2',
            'readonly': false,
            'status': PUBLISHED,
        }
        assert.deepEqual(value, [s1i, s2i]);
    });


    it('Test UNPUBLISHED_SCHEMA', async function () {
        let value = await channel.run(UNPUBLISHED_SCHEMA, '2');
        const s1i = {
            ...s1,
            '_id': '1',
            'id': '1',
            'readonly': false,
            'status': DRAFT,
        }
        const s2i = {
            ...s2,
            '_id': '2',
            'id': '2',
            'readonly': false,
            'status': UNPUBLISHED,
        }
        assert.deepEqual(value, [s1i, s2i]);
    });

    it('Test DELETE_SCHEMA', async function () {
        let value = await channel.run(DELETE_SCHEMA, '2');
        const s1i = {
            ...s1,
            '_id': '1',
            'id': '1',
            'readonly': false,
            'status': DRAFT,
        }
        assert.deepEqual(value, [s1i]);
    });
});