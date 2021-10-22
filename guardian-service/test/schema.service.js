const { expect, assert } = require('chai');
const { schemaAPI } = require('../dist/api/schema.service');
const { createChannel, createTable } = require('./helper');

describe('Schema service', function () {
    let service, channel;

    const SET_SCHEMA = 'set-schema';
    const GET_SCHEMES = 'get-schemes';
    const IMPORT_SCHEMA = 'import-schema';
    const EXPORT_SCHEMES = 'export-schema';

    before(async function () {
        channel = createChannel();
        const schemaRepository = createTable();
        service = schemaAPI(channel,
            schemaRepository
        );
    });

    it('Config service init', async function () {
        assert.exists(channel.map[SET_SCHEMA]);
        assert.exists(channel.map[GET_SCHEMES]);
        assert.exists(channel.map[IMPORT_SCHEMA]);
        assert.exists(channel.map[EXPORT_SCHEMES]);
    });

    it('Test SET_SCHEMA', async function () {
        assert.fail();
    });

    it('Test GET_SCHEMES', async function () {
        assert.fail();
    });

    it('Test IMPORT_SCHEMA', async function () {
        assert.fail();
    });

    it('Test EXPORT_SCHEMES', async function () {
        assert.fail();
    });
});