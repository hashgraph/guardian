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
        '_id': '1',
        'document': {
            '@id': localSchema + '#type',
            '@context': {
                'f1': { '@id': 'https://www.schema.org/text' },
                'f2': { '@id': 'https://www.schema.org/text' },
            }
        },
        'entity': 'entity',
        'status': PUBLISHED,
        'readonly': false,
        'type': 'type'
    }
    const s2 = {
        '_id': '2',
        'document': {
            '@id': localSchema + '#type2',
            '@context': {
                'f3': { '@id': 'https://localhost/schema#type3' },
                'f4': { '@id': 'https://www.schema.org/text' },
            }
        },
        'entity': 'entity2',
        'status': PUBLISHED,
        'readonly': false,
        'type': 'type2'
    }
    const s3 = {
        '_id': '3',
        'document': {
            '@id': localSchema + '#type3',
            '@context': {
                'f5': { '@id': 'https://www.schema.org/text' },
                'f6': { '@id': 'https://www.schema.org/text' },
            }
        },
        'entity': 'entity3',
        'status': PUBLISHED,
        'readonly': false,
        'type': 'type3'
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
                    items[i].document = Object.assign({}, items[i].document, true);
                }
                return items;
            } else {
                items = Object.assign({ _id: String(++index) }, items, true);
                items.document = Object.assign({}, items.document, true);
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
            return schemas.find(e => e._id == id);
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
            type: 'type',
            entity: 'entity',
            readonly: false,
            status: PUBLISHED,
            document: {
                '@id': localSchema + '#type',
                '@context': {
                    'f1': { '@id': 'https://www.schema.org/text' },
                    'f2': { '@id': 'https://www.schema.org/text' },
                }
            }
        });
        assert.deepEqual(value, [s1]);
    });

    it('Test GET_SCHEMES', async function () {
        let value = await channel.run(GET_SCHEMES, null);
        assert.deepEqual(value, [s1]);

        value = await channel.run(GET_SCHEMES, { type: 'type', entity: 'entity' });
        assert.deepEqual(value, { where: { type: { '$eq': 'type' } } });

        value = await channel.run(GET_SCHEMES, { entity: 'entity' });
        assert.deepEqual(value, { where: { entity: { '$eq': 'entity' } } });
    });

    it('Test IMPORT_SCHEMA|EXPORT_SCHEMES', async function () {
        await channel.run(SET_SCHEMA, {
            type: 'type2',
            entity: 'entity2',
            readonly: false,
            status: PUBLISHED,
            document: {
                '@id': localSchema + '#type2',
                '@context': {
                    'f3': { '@id': 'https://localhost/schema#type3' },
                    'f4': { '@id': 'https://www.schema.org/text' },
                }
            }
        });
        await channel.run(SET_SCHEMA, {
            type: 'type3',
            entity: 'entity3',
            readonly: false,
            status: PUBLISHED,
            document: {
                '@id': localSchema + '#type3',
                '@context': {
                    'f5': { '@id': 'https://www.schema.org/text' },
                    'f6': { '@id': 'https://www.schema.org/text' },
                }
            }
        });

        const export1 = await channel.run(EXPORT_SCHEMES, ['type']);
        assert.deepEqual(export1, [s1]);

        const export2 = await channel.run(EXPORT_SCHEMES, ['type', 'type2']);
        assert.deepEqual(export2, [s1, s2, s3]);

        schemas.length = 0;

        const import1 = await channel.run(IMPORT_SCHEMA, export1);
        assert.deepEqual(import1, [s1]);

        const import2 = await channel.run(IMPORT_SCHEMA, export2);
        import2[1].type = 'type';
        import2[1].document['@id'] = 'https://localhost/schema#type';
        assert.deepEqual(import2, [s1, s1, s2, s3]);
    });

    it('Test PUBLISH_SCHEMA', async function () {
        index = 0;
        schemas.length = 0;
        await channel.run(SET_SCHEMA, {
            type: 'type',
            entity: 'entity',
            readonly: false,
            status: DRAFT,
            document: {
                '@id': localSchema + '#type',
                '@context': {
                    'f1': { '@id': 'https://www.schema.org/text' },
                    'f2': { '@id': 'https://www.schema.org/text' },
                }
            }
        });
        await channel.run(SET_SCHEMA, {
            type: 'type2',
            entity: 'entity2',
            readonly: false,
            status: DRAFT,
            document: {
                '@id': localSchema + '#type2',
                '@context': {
                    'f3': { '@id': 'https://www.schema.org/text' },
                    'f4': { '@id': 'https://www.schema.org/text' },
                }
            }
        });
        let value = await channel.run(PUBLISH_SCHEMA, "2");
        assert.deepEqual(value,[
            {
                '_id': '1',
                'document': {
                    '@id': localSchema + '#type',
                    '@context': {
                        'f1': { '@id': 'https://www.schema.org/text' },
                        'f2': { '@id': 'https://www.schema.org/text' },
                    }
                },
                'entity': 'entity',
                'status': DRAFT,
                'readonly': false,
                'type': 'type'
            },
            {
                '_id': '2',
                'document': {
                    '@id': localSchema + '#type2',
                    '@context': {
                        'f3': { '@id': 'https://www.schema.org/text' },
                        'f4': { '@id': 'https://www.schema.org/text' },
                    }
                },
                'entity': 'entity2',
                'status': PUBLISHED,
                'readonly': false,
                'type': 'type2'
            }
        ]);
    });

    it('Test UNPUBLISHED_SCHEMA', async function () {
        let value = await channel.run(UNPUBLISHED_SCHEMA, "2");
        assert.deepEqual(value,[
            {
                '_id': '1',
                'document': {
                    '@id': localSchema + '#type',
                    '@context': {
                        'f1': { '@id': 'https://www.schema.org/text' },
                        'f2': { '@id': 'https://www.schema.org/text' },
                    }
                },
                'entity': 'entity',
                'status': DRAFT,
                'readonly': false,
                'type': 'type'
            },
            {
                '_id': '2',
                'document': {
                    '@id': localSchema + '#type2',
                    '@context': {
                        'f3': { '@id': 'https://www.schema.org/text' },
                        'f4': { '@id': 'https://www.schema.org/text' },
                    }
                },
                'entity': 'entity2',
                'status': UNPUBLISHED,
                'readonly': false,
                'type': 'type2'
            }
        ]);
    });

    it('Test DELETE_SCHEMA', async function () {
        let value = await channel.run(DELETE_SCHEMA, "2");
        assert.deepEqual(value,[
            {
                '_id': '1',
                'document': {
                    '@id': localSchema + '#type',
                    '@context': {
                        'f1': { '@id': 'https://www.schema.org/text' },
                        'f2': { '@id': 'https://www.schema.org/text' },
                    }
                },
                'entity': 'entity',
                'status': DRAFT,
                'readonly': false,
                'type': 'type'
            }
        ]);
    });
});